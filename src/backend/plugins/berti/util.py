import pm4py
from pm4py.objects.ocel.obj import OCEL
from api.model.process_models import (
    DFG_EDGE,
    OCDFG,
    Arc,
    ObjectCentricPetriNet,
    PetriNet,
    Place,
    Transition,
)
from pm4py.objects.petri_net.obj import PetriNet as PMNet


def convert_flat_pm4py_to_ocpn(flat_nets: dict[str, PMNet]) -> ObjectCentricPetriNet:
    place_set: list[Place] = []
    transition_map: dict[str, Transition] = {}
    arcs: list[Arc] = []

    seen_places: set[str] = set()

    for object_type, pm_net in flat_nets.items():
        pm_net = pm_net[0]

        for place in pm_net.places:
            qualified_id = f"{object_type}:{place.name}"
            if qualified_id not in seen_places:
                place_set.append(
                    Place(
                        id=qualified_id,
                        place_type="source"
                        if place == "source"
                        else "sink"
                        if place == "sink"
                        else None,
                        object_type=object_type,
                        annotations={},
                    )
                )
                seen_places.add(qualified_id)

        for transition in pm_net.transitions:
            label = transition.label or transition.name  # Use fallback if label is None
            if label not in transition_map:
                transition_map[label] = Transition(
                    id=label, label=transition.label, annotations={}
                )

        for arc in pm_net.arcs:
            source_id = (
                arc.source.name
                if isinstance(arc.source, (PMNet.Place, PMNet.Transition))
                else str(arc.source)
            )
            target_id = (
                arc.target.name
                if isinstance(arc.target, (PMNet.Place, PMNet.Transition))
                else str(arc.target)
            )

            # Adjust for qualified place IDs
            if isinstance(arc.source, PMNet.Place):
                source_id = f"{object_type}:{source_id}"
            if isinstance(arc.target, PMNet.Place):
                target_id = f"{object_type}:{target_id}"

            # If transition, map to unified label
            if isinstance(arc.source, PMNet.Transition):
                source_id = arc.source.label or arc.source.name
            if isinstance(arc.target, PMNet.Transition):
                target_id = arc.target.label or arc.target.name

            arcs.append(
                Arc(source=source_id, target=target_id, variable=False, annotations={})
            )

    # Assemble the final Petri net and OCPN
    net = PetriNet(
        places=place_set, transitions=list(transition_map.values()), arcs=arcs
    )
    return ObjectCentricPetriNet(
        net=net,
    )


def compute_ocdfg(ocel: OCEL) -> OCDFG:
    ocdfg = pm4py.discover_ocdfg(ocel)

    edges = []
    for object_type, raw_edges in ocdfg["edges"]["event_couples"].items():
        edges = edges + (
            [
                DFG_EDGE(object_type=object_type, source=source, target=target)
                for source, target in raw_edges
            ]
        )

    start_activities = {
        object_type: list(raw_start_activities)
        for object_type, raw_start_activities in ocdfg["start_activities"][
            "events"
        ].items()
    }
    end_activities = {
        object_type: list(raw_end_activities)
        for object_type, raw_end_activities in ocdfg["end_activities"]["events"].items()
    }

    return OCDFG(
        activities=ocdfg["activities"],
        edges=edges,
        object_types=ocdfg["object_types"],
        end_activities=end_activities,
        start_activities=start_activities,
    )
