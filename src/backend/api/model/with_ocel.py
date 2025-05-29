from __future__ import annotations

from contextvars import ContextVar
from typing import TYPE_CHECKING, Any

from pydantic import ValidationInfo, model_validator

from api.model.base import ApiBaseModel

if TYPE_CHECKING:
    from ocel.ocel_wrapper import OCELWrapper


ocel_ctx = ContextVar("ocel")  # type: ContextVar[OCELWrapper]
"""A context variable used to access the OCEL object from deeply nested model validators. The variable is set inside `ocel_access_middleware()`"""


def set_ocel_context(ocel: OCELWrapper):
    ocel_ctx.set(ocel)


class NoOcelError(LookupError):
    pass


class ModelWithOcel(ApiBaseModel):
    """Models extending this class support accessing an OCEL instance, via the .ocel property, in 3 ways:
    - By accessing the ocel_ctx ContextVar internally, set automatically by API middleware
    - After having validated via SomeModel.model_validate(..., context={"ocel": ocel})
    - After having called instance._set_ocel(ocel) manually, after validation
    The second and/or third option are needed because ocel_ctx is not available in background tasks.
    """

    @classmethod
    def instantiate(cls, data: dict[str, Any], ocel: OCELWrapper):
        """Calls the constructor of a subclass, passing the OCEL instance as validation context."""
        return cls.model_validate(data, context={"ocel": ocel})

    @property
    def ocel(self) -> OCELWrapper:
        if ocel := self._get_ocel():
            return ocel

        try:
            if ocel := ocel_ctx.get():
                return ocel
        except LookupError:
            pass

        msg = f"Model of type {self.__class__.__name__} could not access the OCEL instance."
        raise NoOcelError(msg)

    def _set_ocel(self, ocel: OCELWrapper):
        object.__setattr__(self, "__ocel", ocel)

    def _get_ocel(self) -> OCELWrapper | None:
        return getattr(self, "__ocel", None)

    def get_ocel_from_validation_context(self, info: ValidationInfo) -> OCELWrapper:
        if info.context:
            if isinstance(info.context, dict):
                if ocel := info.context["ocel"]:
                    return ocel
        # This potentially raises NoOcelError
        return self.ocel

    @model_validator(mode="after")
    def store_ocel_on_validation(self, info: ValidationInfo):
        """In case the OCEL has been passed as validation context, make it accessible as self.ocel. Gets called on each validation."""
        try:
            if ocel := self.get_ocel_from_validation_context(info):
                self._set_ocel(ocel)
        except NoOcelError:
            pass
        return self
