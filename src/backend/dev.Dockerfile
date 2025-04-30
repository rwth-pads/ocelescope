FROM python:3.10-slim

WORKDIR /app

RUN pip install poetry

COPY src/backend/pyproject.toml src/backend/poetry.lock* /app/
RUN poetry config virtualenvs.create false
RUN poetry install --without dev

COPY src/backend .
COPY ./data ./data
RUN mkdir -p tmp

ENV PYTHONPATH="${PYTHONPATH}:/app"

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--reload"]
