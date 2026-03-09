from .academic import AcademicYearViewSet, AcademicClassViewSet, SectionViewSet, SubjectViewSet
from .profiles import TeacherViewSet, StudentViewSet, ParentViewSet, ParentTeacherMeetingViewSet
from .lesson import ChapterViewSet, LessonViewSet, LessonMaterialViewSet
from .assessment import AssessmentViewSet, QuestionViewSet, SubmissionViewSet, ResultViewSet
from .attendance import AttendanceViewSet
from .timetable import TimetableViewSet
from .exam import ExamViewSet, ExamSeatingViewSet
from .notice import NoticeViewSet
from .reports import ReportViewSet
from .admission import AdmissionEnquiryViewSet
from .erp import SchoolERPOverviewView
from .sis import (
    StudentHealthRecordViewSet,
    DisciplinaryIncidentViewSet,
    StudentDocumentViewSet,
    SISDashboardViewSet,
)
from .events import SchoolEventViewSet
from .inventory import AssetViewSet, MaintenanceRequestViewSet, ConsumableStockViewSet
