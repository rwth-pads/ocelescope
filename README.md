# Ocelescope
>
> ⚠️ **Project Status: Under Construction**
>
> This repository is actively being developed and is **not yet production-ready**.
> Expect frequent changes, incomplete features, and potential bugs.
> Contributions, feedback, and testing are welcome!
>

## Current State of the Tool

## ⚙️ Installation & Usage

### 🧱 Prerequisites

Ensure you have the following installed:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/) (built-in with Docker Desktop ≥ v2.0)
- Unix shell (Linux/macOS/WSL)

---

### ▶️ Running the Application

Use the provided `run.sh` script to start or stop the application in development or production mode:
```./run.sh [dev|prod] [up|down] [--detached]```
or just
```docker compose up --build```

### Import/Export

- [x] Import OCEL:
  - [x] as SQLite
  - [x] as JSON
  - [x] as XML
- [x] Export OCEL
  - [x] as SQLite
  - [x] as JSON
  - [x] as XML
- [ ] Import Resources (Process Models)
  - [ ] Research supported file formats for process models

---

### Session

- [x] Support multiple OCELs per session
- [x] Support extensions for OCELs
  - [x] Quantity State
    - [ ] Add example plugin using the extension (not essential, but needed as proof of concept)
- [x] Add "Session" page:
  - [x] Add, delete, and rename OCELs
  - [x] Add, delete, and rename resources

---

### Filter

- [x] Enable global filtering of OCELs
- [x] Allow filters to be used locally in plugins
- [ ] Implement commonly used filters:
  - [x] By event and object type
  - [x] By relation count
  - [x] By time frame
  - [ ] By attribute values
  - [ ] By start/end events of objects
- [x] Implement reusable filter components
- [ ] Allow saving filters in the session (not essential)
- [ ] Support import/export of filters as JSON (not essential)

---

### Statistics

- [ ] Add plugin for common OCEL statistics:
  - [ ] Visualized as charts
  - [ ] Exportable as images

---

### OCELOT

- [ ] Add OCELOT-inspired plugin with OCEL functionality:
  - [x] Object/Event data table
    - [x] Table with object-event relations
    - [x] Sortable columns
    - [ ] Global search across all fields
    - [ ] Attribute-based column filtering (not essential)

---

### Resources

#### Backend

- [x] Implement a resource system for standardized process models, shared across the session
  - [x] Include example resources:
    - [x] Object-Centric Petri Net
    - [x] Object-Centric Directly-Follows Graph
    - [x] Totem

#### Frontend

- [ ] Add commonly used input fields for process models
- [x] Add process model visualizations:
  - [x] Annotated Object-Centric Petri Nets
  - [x] Annotated Object-Centric Directly-Follows Graphs
  - [x] Totems
- [ ] Enable export as:
  - [x] Image
  - [ ] Specialized file format
- [x] Add discovery plugins for:
  - [x] Object-Centric Directly-Follows Graph
  - [x] Object-Centric Petri Nets
  - [x] Totem
    - [ ] Multi-level resource detection

---

### Plugin Search

- [ ] Add quick search for plugins
- [ ] Add editable sidebar (not essential):
  - [ ] Show recently used plugins as quick access
  - [ ] Allow pinning favorite plugins (not essential)

---

### Task System

- [x] Implement a simplified task system
- [x] Support task deduplication

---

### Invalidation

- [ ] Implement standardized revalidation of sessions in both frontend and backend

---

### Developer Experience / Installation

- [x] Dockerize the application for easy setup
  - [ ] Add GitHub workflow to verify Docker configuration
- [ ] Add Tauri installers
- [ ] Add scripts for auto-generating API methods and plugin files on change detection
