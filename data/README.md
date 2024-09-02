# OCEAn / `data`

## `event_logs`

Contains OCEL 2.0 `.sqlite` files used in this project.

The file `/data/event_logs.json` contains
- the sources of the event logs
- additional dataset metadata used by the app
The file also controls what event logs are shown on the OCEAn start page.

## `preprocessing`

The order management OCEL has been enriched with random distance data attached to customers and all *send package* events associated with packages of orders from those customers (`order_management_distance_attr.ipynb`)

The minimal example (pallet logistics) is created using `create_minimal_ocel.ipynb`

## `evaluation`

TODO

## `units`

- unit definitions that are loaded using the `pint` library (see `src/backend/units/pint.py` for details).
  - Currencies (see `currency_exchange_rates.ipynb` for details)
  - Bytes etc. (new `[information]` dimension)
- list of units and unit types supported by the Climatiq API
- representations of these units in the `pint` library




