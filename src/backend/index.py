from __future__ import annotations

from api.logger import logger
logger.info("Launching OCEAn backend ...")

import datetime
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated, Literal

import emissions.allocation_graph as ag
import emissions.allocation_rules as ar
import pandas as pd
import visualization.ocpn as viz_ocpn
from api.config import OceanConfig, config
from api.dependencies import ApiObjectType, ApiObjectTypes, ApiOcel, ApiSession, ApiTask
from api.docs import init_custom_docs
from api.exceptions import BadRequest, NotFound, Unauthorized
from api.middleware import ocel_access_middleware
from api.model.app_state import AppState, ObjectAllocationConfig
from api.model.base import RequestBody, SerializableSeries
from api.model.emissions import EmissionRuleDiscr
from api.model.ocean_units import KG_CO2E, Unit, parse_ocean_unit
from api.model.response import BaseResponse, OcelResponse, TempFileResponse
from api.model.task import LaunchTaskResponse, TaskStatusResponse
from api.model.with_ocel import set_ocel_context
from api.serialize import (
    OcelEvent,
    OcelObject,
    events_to_api,
    objects_to_api,
    ocel_to_api,
)
from api.session import Session
from api.tasks import ComputeEmissionsResponse, compute_emissions_task
from api.utils import (
    custom_snake2camel,
    error_handler_server,
    export_openapi_schema,
    verify_parameter_alias_consistency,
)
from emissions import allocation
from emissions.emission_model import EMISSIONS_KG_NAME, EMISSIONS_NAME, EmissionModel
from emissions.factors.emission_factor import LocalEmissionFactor
from emissions.rules.e2o_emission_rule import E2OEmissionRule
from emissions.rules.event_emission_rule import EventEmissionRule
from fastapi import FastAPI, File, Header, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ocel.attribute import (
    AttributeDefinition,
    EventAttributeDefinition,
    ObjectAttributeDefinition,
    OCELAttribute,
)
from ocel.default_ocel import (
    DEFAULT_OCEL_KEYS,
    DefaultOCEL,
    filter_default_ocels,
    get_default_ocel,
    load_default_ocels,
)
from ocel.ocel_wrapper import OCELWrapper
from pydantic import Field, ValidationError, model_validator
from units.climatiq import ClimatiqUnitType
from units.pint import UnitMismatchError, is_weight, ureg
from util.misc import export_example_settings_as_dotenv, pluralize, set_str
from version import __version__

"""
In this file, all API routes of the OCEAn application are defined.
"""

# Init default sessions
load_default_ocels()

# Initialize FastAPI
app = FastAPI(
    title="OCEAn",
    version=__version__,
    docs_url=None,  # disable swagger docs, use rapidoc instead (call to init_custom_docs below)
    redoc_url=None,
    debug=True,
)
app.add_middleware(
    CORSMiddleware,
    # allow_origins=list(filter(None, [os.getenv("FRONTEND_URL")])),
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(ocel_access_middleware)

# Error handler for internal server errors
app.exception_handler(Exception)(error_handler_server)
init_custom_docs(app)


# ----- TASK MANAGEMENT ------------------------------------------------------------------------------------------
# region


@app.get("/task-status", summary="Task status")
def task_status(
    session: ApiSession,
    task: ApiTask,
) -> TaskStatusResponse:
    """Return the status of a long-running task."""
    return TaskStatusResponse(**session.respond(route="task-status", msg=None, task=task))


# endregion

# ----- EMISSION COMPUTATION ------------------------------------------------------------------------------------------
# region


class ValidateEmissionRuleRequest(RequestBody):
    rule: EmissionRuleDiscr


class ValidateEmissionRuleResponse(BaseResponse):
    rule: EmissionRuleDiscr


@app.post(
    "/validate-emission-rule", summary="Validates an emission rule and computes a display name"
)
def validate_emission_rule(
    session: ApiSession,
    ocel: ApiOcel,
    req: ValidateEmissionRuleRequest,
) -> ValidateEmissionRuleResponse:
    return ValidateEmissionRuleResponse(
        **session.respond(
            "validate-emission-rule",
            rule=req.rule,
        )
    )


class GetAvailableAttributesRequest(RequestBody):
    type: Literal["EventEmissionRule", "E2OEmissionRule"]
    activity: str
    object_type: str | None = None
    qualifier: str | None = None
    numeric_only: bool = False

    @model_validator(mode="after")
    def validate_request(self):
        if self.type == "EventEmissionRule":
            if self.object_type is not None or self.qualifier is not None:
                raise ValueError
        if self.type == "E2OEmissionRule":
            if self.object_type is None:
                raise ValueError
        return self


class GetAvailableAttributesResponse(BaseResponse):
    available_event_attributes: list[EventAttributeDefinition]
    available_object_attributes: list[tuple[str, str | None, ObjectAttributeDefinition]]


@app.post("/get-available-attributes", summary="")
def get_available_attributes_for_emission_rule(
    session: ApiSession,
    ocel: ApiOcel,
    req: GetAvailableAttributesRequest,
) -> GetAvailableAttributesResponse:
    dummy_factor = LocalEmissionFactor(source="local", value=1 * KG_CO2E, attributes=[])
    if req.type == "EventEmissionRule":
        rule = EventEmissionRule.instantiate(
            dict(
                index=42,
                type="EventEmissionRule",
                # factor_source="user",
                activity=req.activity,
                factor=dummy_factor,
            ),
            ocel=ocel,
        )
    elif req.type == "E2OEmissionRule":
        rule = E2OEmissionRule.instantiate(
            dict(
                index=42,
                type="E2OEmissionRule",
                # factor_source="user",
                activity=req.activity,
                object_type=req.object_type,
                qualifier=req.qualifier,
                factor=dummy_factor,
            ),
            ocel=ocel,
        )
    else:
        raise TypeError

    eattrs = [session.app_state.get_attribute_definition(ea) for ea in rule.available_eattrs()]
    eattrs = [ea for ea in eattrs if ea is not None]
    oattrs = [
        (ot, q, session.app_state.get_attribute_definition(oa))
        for ot, q, oa in rule.directly_available_oattrs() + rule.uniquely_available_oattrs()
    ]
    # Remove qualified oattrs if the non-qualified version is available
    # (Only here - in rule validation, both is allowed, that's why both are returned in the lists)
    non_qualified_oattr_names = [(ot, oa.name) for ot, q, oa in oattrs if q is None and oa]
    oattrs = [
        (ot, q, oa)
        for ot, q, oa in oattrs
        if oa is not None and not (q is not None and (ot, oa.name) in non_qualified_oattr_names)
    ]

    # Additional filters
    if req.numeric_only:
        eattrs = [ea for ea in eattrs if ea.attr_data.numeric]
        oattrs = [(ot, q, oa) for (ot, q, oa) in oattrs if oa.attr_data.numeric]

    return GetAvailableAttributesResponse(
        **session.respond(
            route="get-available-attributes",
            available_event_attributes=eattrs,
            available_object_attributes=oattrs,
        )
    )


class ComputeEmissionsRequestBody(RequestBody):
    rules: list[EmissionRuleDiscr] = Field()


@app.post("/compute-emissions", summary="Compute emissions")
def compute_emissions(
    session: ApiSession,
    ocel: ApiOcel,
    req: ComputeEmissionsRequestBody,
) -> LaunchTaskResponse[ComputeEmissionsResponse]:
    em = session.emission_model

    # Build model. Even if session has an emission model, parse a new one to then compare hashes
    old_hash = hash(em)
    new_hash = EmissionModel.rules_hash(req.rules)

    # Compare hashes
    if old_hash == new_hash:
        # Return old model instance
        logger.info(f"No changes in emission model")
    else:
        # Save the new emission model in session
        logger.info(f"Update emission model")
        em.set_rules(req.rules)

    return compute_emissions_task(session=session)


# endregion

# Removed route /interval-transformation

# ----- PROCESS DISCOVERY ------------------------------------------------------------------------------------------
# region


class ObjectTypeRequestBody(RequestBody):
    object_type: ApiObjectType


class WeightedDirectedGraphResponse(BaseResponse):
    graph: dict[str, dict[str, int]]

    @staticmethod
    def graph_from_tuples(edges: dict[tuple[str, str], int]) -> dict[str, dict[str, int]]:
        res = {}
        for (u, v), i in edges.items():
            if u not in res:
                res[u] = {}
            res[u][v] = i
        return res


class DirectedGraphResponse(BaseResponse):
    graph: dict[str, set[str]]

    @staticmethod
    def graph_from_tuples(edges: set[tuple[str, str]]) -> dict[str, set[str]]:
        res = {}
        for u, v in edges:
            if u not in res:
                res[u] = set()
            res[u].add(v)
        return res


@app.post("/dfg", summary="Directly-follows graph discovery")
def discover_dfg(
    session: ApiSession,
    ocel: ApiOcel,
    req: ObjectTypeRequestBody,
) -> WeightedDirectedGraphResponse:

    dfg = ocel.directly_follows_graph(otype=req.object_type)

    return WeightedDirectedGraphResponse(
        **session.respond(
            route="dfg",
            msg=f"Directly-follows graph of '{req.object_type}' has been discovered.",
            graph=WeightedDirectedGraphResponse.graph_from_tuples(dfg),
        )
    )


@app.post("/efg", summary="Eventually-follows graph discovery")
def discover_efg(
    session: ApiSession,
    ocel: ApiOcel,
    req: ObjectTypeRequestBody,
) -> DirectedGraphResponse:

    efg = ocel.eventually_follows_graph(otype=req.object_type)

    return DirectedGraphResponse(
        **session.respond(
            route="efg",
            msg=f"Eventually-follows graph of '{req.object_type}' has been discovered.",
            graph=DirectedGraphResponse.graph_from_tuples(efg),
        )
    )


class OcpnRequestBody(RequestBody):
    object_types: ApiObjectTypes


class OcpnResponse(BaseResponse):
    ocpn: viz_ocpn.OCPN


@app.post("/ocpn", summary="OCPN discovery")
def ocpn(
    session: ApiSession,
    ocel: ApiOcel,
    req: OcpnRequestBody,
) -> OcpnResponse:

    ocpn = ocel.ocpn(otypes=req.object_types)  # type: ignore

    # TODO minimize/rename the function, it does not do visualization any more
    ocpn = viz_ocpn.visualize(
        ocpn, parameters={viz_ocpn.Parameters.UUIDS: False, viz_ocpn.Parameters.RANKDIR: "LR"}
    )

    return OcpnResponse(
        **session.respond(
            route="ocpn",
            msg=f"Object-centric Petri Net has been discovered successfully.",
            ocpn=ocpn,
        )
    )


# endregion

# ----- OBJECT ALLOCATION ------------------------------------------------------------------------------------------
# region


class ObjectAllocationRequestBody(RequestBody):
    object_allocation_config: ObjectAllocationConfig


class ObjectAllocationResponse(BaseResponse):
    object_allocation_config: ObjectAllocationConfig
    object_emissions: SerializableSeries
    # emissions: ProcessEmissions


@app.post("/object-allocation", summary="Allocate emissions from events to objects")
def object_allocation(
    session: ApiSession,
    ocel: ApiOcel,
    req: ObjectAllocationRequestBody,
) -> ObjectAllocationResponse:

    em = session.emission_model
    if em is None or em.emissions is None:
        raise BadRequest(
            "Event emissions is not available. Try first adding and executing an emission rule."
        )

    event_emissions = em.emissions.event_emissions.rename("ocean:event_emissions")
    event_emissions = ocel.events.join(event_emissions, on="ocel:eid")
    e2o_emissions = em.emissions.e2o_emissions.rename("ocean:e2o_emissions")
    e2o_emissions = ocel.relations.join(e2o_emissions, on=["ocel:eid", "ocel:oid"])

    cnf = req.object_allocation_config
    session.app_state.object_allocation_config = cnf

    def rule_factory(alloc: allocation.Allocator):
        if cnf.rule == "AllTargets":
            return ar.AllTargetsAllocation(alloc)
        if cnf.rule == "ParticipatingTargets":
            return ar.ParticipatingTargetsAllocation(alloc)
        if cnf.rule == "ClosestTargets":
            if isinstance(cnf.max_distance, int) and cnf.max_distance != -1:
                max_distance = cnf.max_distance
            else:
                max_distance = 7  # TODO

            return ar.ClosestTargetsAllocation(
                alloc,
                graph_mode=ag.GraphMode.OBJ_OBJ if cnf.graph_mode == "full" else ag.GraphMode.HU_HU,
                remove_otype_loops=(
                    cnf.remove_otype_loops if cnf.remove_otype_loops is not None else False
                ),
                max_distance=max_distance,
            )
        raise BadRequest("Unknown allocation rule.")

    alloc = allocation.Allocator(
        ocel=ocel,
        event_emissions=event_emissions,
        e2o_emissions=e2o_emissions,
        hu_otypes=session.app_state.hu_otypes,
        resource_otypes=session.app_state.resource_otypes,
        targets=cnf.target_object_types,
        rule=rule_factory,
    )

    success = alloc.process()
    if not success:
        raise ValueError("Allocation invariant not fulfilled")

    # Save object emissions to EmissionModel
    em.alloc = alloc
    em.emissions.object_emissions = alloc.target_emissions

    return ObjectAllocationResponse(
        **session.respond(
            route="object-allocation",
            msg=f"Emissions have been allocated to the target objects.",
            emissions=em.emissions,
        ),
        object_emissions=em.emissions.object_emissions,
        object_allocation_config=cnf,
    )


# endregion

# ----- IMPORT / LOAD ------------------------------------------------------------------------------------------
# region


@app.post("/import", summary="Import OCEL 2.0 from .sqlite file")
def import_ocel(
    file: Annotated[
        UploadFile,
        File(description="An OCEL 2.0 event log (.sqlite format)"),
    ],
    name: Annotated[
        str,
        Query(description="The name of the uploaded file", pattern=r"[\w\-\(\)]+\.[a-z]+"),
        # Need original file name because client-side formData creation in generated api wrapper does not retain it
    ],
) -> OcelResponse:
    if file.filename is None or file.filename == "":
        raise BadRequest("No file uploaded")

    # Check file
    # ...

    # Save file
    upload_date = datetime.datetime.now()
    file_name_path = Path(name)
    tmp_file_prefix = upload_date.strftime("%Y%m%d-%H%M%S") + "-" + file_name_path.stem

    try:
        with NamedTemporaryFile(
            delete=False,
            prefix=tmp_file_prefix,
            suffix=file_name_path.suffix,
        ) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)
    except Exception as err:
        raise err
    finally:
        file.file.close()

    # pm4py-based import
    ocel = OCELWrapper.read_ocel2_sqlite_with_report(
        str(tmp_path),
        original_file_name=name,
        version_info=True,
        output=False,
        upload_date=upload_date,
    )
    set_ocel_context(ocel)

    # Init session
    session = Session(
        ocel=ocel,
        emission_model=EmissionModel(ocel=ocel),
        app_state=AppState.import_sqlite(tmp_path, ocel=ocel),
    )

    # Initialize EmissionModel according to appState
    session.emission_model.set_rules(session.app_state.emission_rules or [])
    imported_emissions, input_eattrs = extract_imported_emissions(
        session.app_state.emission_attributes, session
    )
    if imported_emissions is not None and input_eattrs:
        session.emission_model.set_imported_emissions(
            imported_emissions,
            unit=KG_CO2E,  # type: ignore
        )

    return OcelResponse(
        **session.respond(
            route="import",
            msg=f'Event log "{name}" has been uploaded and processed on the server.',
            ocel=ocel_to_api(ocel, session=session),
            emissions=session.emission_model.emissions,
        )
    )


@app.get("/import-default", summary="Import default OCEL")
def import_default_ocel(
    key: str = Query(
        description="Default OCEL key",
        examples=DEFAULT_OCEL_KEYS,
    ),
    version: str | None = Query(
        default=None,
        description="Dataset version (optional)",
        examples=["1.0"],
    ),
) -> OcelResponse:

    default_ocel = get_default_ocel(key=key, version=version)
    if default_ocel is None:
        raise NotFound("The given default OCEL was not found")

    # Load OCEL
    ocel = default_ocel.get_ocel_copy(use_abbreviations=False)
    set_ocel_context(ocel)

    # Load default app state (JSON)
    app_state = None
    if default_ocel.default_app_state:
        try:
            AppState.instantiate(default_ocel.default_app_state, ocel=ocel)
        except ValidationError as err:
            # When attribute units are saved to the JSON file with a renamed name (after unit detection), these will cause a Validation error here.
            is_attr_not_found = ["attribute not found" in e["msg"] for e in err.errors()]
            if not all(is_attr_not_found):
                raise err

            logger.warning(
                f"Attribute(s) from default app state not found, skipping attribute units ..."
            )
            default_ocel.default_app_state.pop("attributeUnits")
            app_state = AppState.instantiate(default_ocel.default_app_state, ocel=ocel)

    # Load app state (sqlite)
    if default_ocel.app_state and not default_ocel.app_state.empty:
        if app_state and not app_state.empty:
            logger.warning(
                "Default OCEL has both default app state (JSON) and app state (sqlite) specified. Using values from sqlite."
            )
        app_state = default_ocel.app_state

    if app_state is None:
        app_state = AppState.instantiate({}, ocel=ocel)

    # Init session
    session = Session(
        ocel=ocel,
        emission_model=EmissionModel(ocel=ocel),
        app_state=app_state,
    )

    # Initialize EmissionModel according to appState
    session.emission_model.set_rules(session.app_state.emission_rules or [])
    imported_emissions, input_eattrs = extract_imported_emissions(
        session.app_state.emission_attributes, session
    )
    if imported_emissions is not None and input_eattrs is not None:
        session.emission_model.set_imported_emissions(
            imported_emissions,
            unit=KG_CO2E,  # type: ignore
        )

    return OcelResponse(
        **session.respond(
            route="import-default",
            msg=f'Event log "{default_ocel.name or key}" has been imported from the server.',
            ocel=ocel_to_api(session.ocel, session=session),
            emissions=session.emission_model.emissions,
        )
    )


@app.get("/load", summary="Load OCEL")
def load_ocel(
    session: ApiSession,
    ocel: ApiOcel,
) -> OcelResponse:
    return OcelResponse(
        **session.respond(
            route="load",
            msg=f'Event log "{ocel.meta["fileName"] or session.id}" has been loaded from the server.',
            ocel=ocel_to_api(ocel, session=session),
            emissions=session.emission_model.emissions,
        )
    )


# endregion

# ----- DOWNLOAD / EXPORT ------------------------------------------------------------------------------------------
# region


@app.get("/download", summary="Download OCEL including app state")
def download_ocel(
    session: ApiSession,
    ocel: ApiOcel,
    token: Annotated[str, Header()],
    emissions: Literal["events", "objects", False] = Query(
        default=False,
        description="Controls on what level emission values are included in the resulting OCEL file as a new attribute. To preserve overall emissions, it is not possible to include both event and object emissions.",
    ),
) -> TempFileResponse:
    # Authenticate via api state
    # TODO might use this for all API routes - or research different token-based auth method
    if token != session.state:
        raise Unauthorized

    if emissions is not False:
        em = session.emission_model
        if em is None:
            raise BadRequest("No emission model available. Try first adding an emission rule.")
        if em.emissions is None:
            raise BadRequest("No emissions available. Try adding and executing an emission rule.")

        event_emissions = em.emissions.total_event_emissions
        object_emissions = em.emissions.object_emissions
        attr_name = EMISSIONS_NAME
        defs = []

        # Include event emissions as event attribute
        if emissions == "events":
            if event_emissions is None:
                raise BadRequest(
                    "No event emissions available. Try adding and executing an emission rule."
                )
            logger.info(
                f"exporting event emissions ({em.emissions.overall_emissions * em.emissions.unit} total)"
            )
            if attr_name in ocel.events.columns:
                raise ValueError(f'Event attribute name "{attr_name}" already taken.')
            # Remove object emissions if contained in OCEL
            if attr_name in ocel.objects.columns:
                logger.warning(f'Dropping static object attribute "{attr_name}".')
                ocel.objects.drop(columns=[attr_name], inplace=True)
                ocel.ocel.objects = ocel.objects
            if attr_name in ocel.objects.columns:
                logger.warning(f'Dropping dynamic object attribute "{attr_name}".')
                ocel.object_changes.drop(columns=[attr_name], inplace=True)
                # TODO additionally, might need to drop all ROWS where "ocel:field" == attr_name
                ocel.ocel.object_changes = ocel.object_changes
            # Add event emissions
            ocel.events = ocel.ocel.events = ocel.events.join(
                event_emissions.set_index("ocel:eid")[EMISSIONS_KG_NAME].rename(attr_name),
                on="ocel:eid",
            )
            # Clear attribute information cache
            OCELAttribute.reset_attributes_cache(ocel)

            # Add emissions unit to AppState
            activities = sorted(
                set(event_emissions[event_emissions[EMISSIONS_KG_NAME].notna()]["ocel:activity"])
            )
            attrs = [ocel.find_attribute(activity=act, name=attr_name) for act in activities]
            defs = [attr.to_definition(unit=em.emissions.unit) for attr in attrs if attr]
            if session.app_state.attribute_units is None:
                session.app_state.attribute_units = []
            session.app_state.attribute_units += defs

        # Include object emissions as object attribute
        if emissions == "objects":
            if object_emissions is None:
                raise BadRequest("No object emissions available. Try executing object allocation.")
            logger.info(
                f"exporting object emissions ({em.emissions.overall_emissions * em.emissions.unit} total)"
            )
            if attr_name in set(ocel.objects.columns).union(ocel.object_changes.columns):
                raise ValueError(f'Object attribute name "{attr_name}" already taken.')
            # Remove event emissions if contained in OCEL
            if attr_name in ocel.events.columns:
                logger.warning(f'Dropping event attribute "{attr_name}".')
                ocel.events.drop(columns=[attr_name], inplace=True)
                ocel.ocel.events = ocel.events
            # Add object emissions
            ocel.objects = ocel.ocel.objects = ocel.objects.join(
                object_emissions.rename(attr_name),
                on="ocel:oid",
                how="left",
            )
            # Clear attribute information cache
            OCELAttribute.reset_attributes_cache(ocel)

            # Add emissions unit to AppState
            otypes = sorted(set(ocel.objects[ocel.objects[attr_name].notna()]["ocel:type"]))
            attrs = [ocel.find_attribute(otype=ot, name=attr_name) for ot in otypes]
            defs = [attr.to_definition(unit=em.emissions.unit) for attr in attrs if attr]
            if session.app_state.attribute_units is None:
                session.app_state.attribute_units = []
            session.app_state.attribute_units += defs

        # Mark new attributes as emissions output
        if defs:
            logger.info(f"Marking {len(defs)} attributes as emissions output")
            em.emissions_output_attrs = defs

            # TODO update emission_attributes app state

    # Export to file
    name = ocel.meta["fileName"]
    tmp_file_prefix = datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + name
    file_response = TempFileResponse(prefix=tmp_file_prefix, suffix=".sqlite", filename=name)
    session.export_sqlite(file_response.tmp_path)
    return file_response


# endregion

# ----- UPDATE APP STATE ------------------------------------------------------------------------------------------
# region


class UpdateAppStateRequestBody(RequestBody):
    app_state: AppState = Field(
        description="User input to be saved in the server session",
    )


class UpdateAppStateResponse(BaseResponse):
    pass
    # emissions: ProcessEmissions | None = None

    # @model_validator(mode="after")
    # def test(self):
    #     print(self.emissions)
    #     return self


def check_update_attribute_units(
    session: Session,
    prev_state: AppState,
    new_state: AppState,
):
    assert session.app_state is prev_state
    if (new_attrs := new_state.attribute_units) is None:
        return True
    prev_attrs = prev_state.attribute_units or []
    if new_attrs == prev_attrs:
        return True
    if (em := session.emission_model) is None:
        return True

    prev_changed_attrs = [attr for attr in prev_attrs if attr not in new_attrs]

    for rule in em._rules:
        for qattr in rule.factor.attributes:
            if qattr.attribute in prev_changed_attrs:
                # Deny change of app state
                return f"The attribute {qattr.attribute.name} is used in an emission rule, therefore, its unit cannot be changed."
    return True


@app.put("/update", summary="Update user input")
def update_state(
    session: ApiSession,
    ocel: ApiOcel,
    req: UpdateAppStateRequestBody,
) -> UpdateAppStateResponse:
    prev_state = session.app_state
    new_state = req.app_state

    check = check_update_attribute_units(session, prev_state, new_state)
    if check is not True:
        msg = f"App state could not be updated: {check}"
        logger.warning(msg)
        raise BadRequest(msg)

    session.app_state = req.app_state

    # Based on emission_attributes, update imported event emissions
    emissions = None
    if (attrs := req.app_state.emission_attributes) is not None:
        if attrs == prev_state.emission_attributes:
            logger.info(f"emission_attributes did not change, skipping ...")
        else:
            imported_emissions, input_eattrs = extract_imported_emissions(attrs, session)
            if imported_emissions is not None and input_eattrs:
                emissions = session.emission_model.set_imported_emissions(
                    imported_emissions,
                    unit=KG_CO2E,  # type: ignore
                )
                return UpdateAppStateResponse(
                    **session.respond(
                        route="update",
                        msg=f'Emissions have been imported from {pluralize(len(input_eattrs), pl="attributes")}.',
                        emissions=emissions,
                    )
                )

    return UpdateAppStateResponse(
        **session.respond(
            route="update",
            msg=f"The session has been saved on the server.",
        )
    )


def extract_imported_emissions(
    attrs: list[AttributeDefinition] | None,
    session: Session,
) -> tuple[pd.Series | None, list[EventAttributeDefinition]]:
    """Returns a Series of emissions per events extracted from the sum of attribute values, all converted to kg."""
    em = session.emission_model
    ocel = session.ocel
    if not attrs:
        return None, []
    
    # Make sure all attrs are weights
    if not all(is_weight(attr.unit) for attr in attrs):
        raise UnitMismatchError(f"Emission attributes are not all weights")

    eattrs = [attr for attr in attrs if isinstance(attr, EventAttributeDefinition)]

    # Filter out emission rule outputs
    # input_eattrs = [attr for attr in rattrs if attr.name != EMISSION_RESULTS_ATTR_NAME]
    if em is not None:
        input_eattrs = [
            attr
            for attr in eattrs
            if not any(attr == out for out in em.emissions_output_attrs)
        ]
    else:
        input_eattrs = eattrs

    logger.info(
        f"Extracting emissions from {len(input_eattrs)} of {len(attrs)} attributes"
    )
    if not input_eattrs:
        return None, []
    
    # Check if there is at most one attribute per activity
    activities = [attr.activity for attr in input_eattrs]
    duplicate_activities = {act for act in set(activities) if activities.count(act) > 1}
    if duplicate_activities:
        logger.warning(
            f"Multiple input event emission attributes specified for activity(s) {set_str(duplicate_activities)}. Computing the sum."
        )

    # Extract attribute values and convert all to kg
    attr_data = []
    for attr in input_eattrs:
        x = ocel.attribute_values(attr)
        values = ureg.Quantity(x.values, attr.unit)
        attr_data.append(
            pd.Series(values.to(KG_CO2E).magnitude, name=x.name, index=x.index)
        )

    # Combine all attributes and compute sum
    df = pd.concat(attr_data, axis=1)
    imported_emissions = df.fillna(0).sum(axis=1, skipna=True).rename(EMISSIONS_KG_NAME)
    return imported_emissions, input_eattrs


# endregion


# ----- MISC ------------------------------------------------------------------------------------------
# region


class SampleObjectsResponse(BaseResponse):
    objects: list[OcelObject]


@app.get("/sample-objects", summary="Sample objects")
def sample_objects(
    session: ApiSession,
    ocel: ApiOcel,
) -> SampleObjectsResponse:
    objects = ocel.objects.sample(n=10)
    data = objects_to_api(objects, include_empty_attrs=False, include_empty_values=False)
    return SampleObjectsResponse(
        **session.respond(
            route="sample-objects",
            msg="Objects have been sampled",
            objects=data,
        )
    )


class SampleEventsResponse(BaseResponse):
    events: list[OcelEvent]


@app.get("/sample-events", summary="Sample events")
def sample_events(
    session: ApiSession,
    ocel: ApiOcel,
) -> SampleEventsResponse:
    events = ocel.events.sample(n=10)
    data = events_to_api(events, include_empty_attrs=False, include_empty_values=False)
    return SampleEventsResponse(
        **session.respond(
            route="sample-events",
            msg="Events have been sampled",
            events=data,
        )
    )


@app.get("/ocel/default", summary="Get default OCEL metadata")
def default_ocels(
    only_latest_versions: bool = True,
    only_preloaded: bool = False,
) -> list[DefaultOCEL]:
    filtered = filter_default_ocels(
        exclude_hidden=True,
        only_latest_versions=only_latest_versions,
        only_preloaded=only_preloaded,
    )
    return filtered


@app.get("/climatiq/units/list", summary="Get list of climatiq units")
def get_climatiq_units() -> list[ClimatiqUnitType]:
    return list(ClimatiqUnitType._UNIT_TYPES.values())


@app.get("/units/search", summary="Search for a unit")
def unit_search(q: str = Query()) -> Unit | None:
    # TODO this needs to return a Quantity instead of a Unit: E.g. kWh, L/100km contain a magnitude!
    unit = parse_ocean_unit(q)
    return unit  # type: ignore


# endregion


def post_init_tasks():
    """Non-blocking tasks to be executed after the API has been initialized"""

    # Verify parameter aliases are consistent
    verify_parameter_alias_consistency(app, custom_snake2camel)

    # Generate .env.example file
    export_example_settings_as_dotenv(OceanConfig, ".env.example")

    # Export OpenAPI schema to file
    export_openapi_schema(app, config.OPENAPI_SCHEMA_PATH)


post_init_tasks()
