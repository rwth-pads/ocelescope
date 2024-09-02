from ocel.default_ocel import *

OCEL_KEY = "p2p"
OCEL_VERSION = 1
USE_ABBRS = True


OCEL_DATA = get_default_ocel(
    key=OCEL_KEY,
    version=OCEL_VERSION,
)
ocel = OCELWrapper.read_ocel2_sqlite_with_report(OCEL_DATA.path, version_info=True, output=False)
if USE_ABBRS and OCEL_DATA.abbr_map is not None:
    ocel = ocel.translate(OCEL_DATA.abbr_map)
    print("Translated OCEL.")


resource_otypes = set()
hu_otypes = {
    "goods rcpt.",
    "invoice rcpt.",
    "material",
    "payment",
    "purch. order",
    "purch. req.",
    "quotation",
}
target_otypes = {"purch. req."}
# hu_otypes = {
#     "quotation",
#     "purchase_requisition",
#     "payment",
#     "material",
#     "invoice receipt",
#     "purchase_order",
#     "goods receipt",
# }
# target_otypes = {"purchase_requisition"}
