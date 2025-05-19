FROM python:3.10-slim

WORKDIR /app

RUN pip install poetry

COPY src/backend/pyproject.toml src/backend/poetry.lock* /app/

RUN poetry config virtualenvs.create false
RUN poetry install --no-root --with dev

# Create folders to prevent volume overwrite issues
RUN mkdir -p /app/data /app/tmp

ENV PYTHONPATH=/app

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

