def otq(otype: str, qualifier: str | None = None) -> str:
    """String representation of an object type specification with optional qualifier filtering."""
    return f"{otype}/{qualifier}" if qualifier is not None else otype
