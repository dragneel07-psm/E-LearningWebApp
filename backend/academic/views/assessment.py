"""
Backwards-compatible re-exports.
Real implementation lives in the split modules:
  - assessment_core.py    → AssessmentViewSet
  - question.py           → QuestionViewSet
  - submission.py         → SubmissionViewSet
  - result.py             → ResultViewSet
"""
from .assessment_core import AssessmentViewSet
from .question import QuestionViewSet
from .submission import SubmissionViewSet
from .result import ResultViewSet

__all__ = ['AssessmentViewSet', 'QuestionViewSet', 'SubmissionViewSet', 'ResultViewSet']
