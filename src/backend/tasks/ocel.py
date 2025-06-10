from datetime import datetime
from pathlib import Path
import shutil
from tempfile import NamedTemporaryFile

from fastapi.datastructures import UploadFile
from api.session import Session
from ocel.ocel_wrapper import OCELWrapper
from util.tasks import task


@task()
def import_ocel_task(
    session: Session,
    path: Path,
    name: str,
    suffix: str,
    upload_date: datetime,
    stop_event=None,
):  # Save file
    # pm4py-based import
    ocel = OCELWrapper.read_ocel(
        str(path),
        original_file_name=name,
        version_info=True,
        output=True,
        upload_date=upload_date,
    )

    session.add_ocel(ocel)
