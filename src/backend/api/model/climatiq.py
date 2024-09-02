class ClimatiqApiError(Exception):
    """Representation of climatiq api errors (https://www.climatiq.io/docs/api-reference/errors#error-json-structure)"""

    def __init__(self, error: str, message: str, error_code: int | None, **kwargs):
        self.error = error
        self.message = message
        self.error_code = error_code
        self.additional_data = kwargs
        super().__init__(
            "/".join([s for s in [error, error_code] if s])
            + ": "
            + message
            + ("" if not kwargs else str(kwargs))
        )


# class ClimatiqEmissionFactor(ApiBaseModel):
