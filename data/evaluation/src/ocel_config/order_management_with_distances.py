from ocel.default_ocel import *

OCEL_KEY = "orderManagementWithDistances"
OCEL_VERSION = "1"
USE_ABBRS = False


OCEL_DATA = get_default_ocel(
    key=OCEL_KEY,
    version=OCEL_VERSION,
)
ocel = OCELWrapper.read_ocel2_sqlite_with_report(OCEL_DATA.path, version_info=True, output=False)
if USE_ABBRS and OCEL_DATA.abbr_map is not None:
    ocel = ocel.translate(OCEL_DATA.abbr_map)
    print("Translated OCEL.")


resource_otypes = {"customers", "employees", "products"}
hu_otypes = {"items", "orders", "packages"}
target_otypes = {"orders"}
