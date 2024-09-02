# Use Python image
FROM python:3.10-slim

# Set work directory
WORKDIR /app

# Install Poetry
RUN pip install poetry

# Copy pyproject.toml and poetry.lock (if available)
COPY src/backend/pyproject.toml src/backend/poetry.lock* /app/

# Disable virtual environment as Docker container provides isolation
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-dev

# Copy application code
COPY src/backend .

# Copy data directory
COPY ./data ./data

RUN mkdir -p tmp

# Optionally, adjust PYTHONPATH to ensure imports work as expected
# This step might be unnecessary if your package structure is correctly set up
ENV PYTHONPATH "${PYTHONPATH}:/app/backend"

# Run FastAPI app
CMD ["uvicorn", "index:app", "--host", "0.0.0.0"]