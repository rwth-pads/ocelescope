"""To be imported in jupyter notebooks.
Assumes
- current directory is /src/backend
- repo root has been added to PATH (sys.path)"""

import collections
import itertools
import json
import os
import sys
import timeit
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Literal, Optional, Set, Tuple, Union

import graphviz as gv
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import pandas as pd
import pm4py
import seaborn as sns
from pm4py.objects.ocel.obj import OCEL

# path = Path(os.getcwd())
# try:
#     i = path.parts.index("drafts")
#     os.chdir(Path(*path.parts[:i]))
# except ValueError:
#     pass

assert Path(os.getcwd()).parts[-2:] == ("src", "backend")
sys.path.append("../")

import emissions.allocation as allocation
import emissions.allocation_graph as ag
import emissions.allocation_rules as ar
import ocel.utils as ocel_util
import util.graph as graph_util
import util.latex as latex_util
import util.misc as util
import util.pandas as pd_util
from api.task_base import SubTask, Task, TqdmTask
from api.utils import *
from ocel.attribute import *
from ocel.ocel_wrapper import *
from visualization.constants import *

import data.evaluation.src.pandas_style as pd_style
import data.evaluation.src.result_export as export
from data.evaluation.src.jupyter_utils.logger import logger
