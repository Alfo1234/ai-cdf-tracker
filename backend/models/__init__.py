"""
Model import hub.

SQLAlchemy/SQLModel only registers models that are imported at runtime.
We import every model here so that relationships like "ProcurementAward"
can be resolved when other modules (like ML training) import backend.models.
"""

from .constituency import Constituency
from .contractor import Contractor
from .procurement_award import ProcurementAward

from .project import Project
from .project_image import ProjectImage
from .feedback import Feedback
from .user import User