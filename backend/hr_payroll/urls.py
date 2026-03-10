from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    EmployeeViewSet,
    HRDashboardViewSet,
    LeaveApplicationViewSet,
    LeaveTypeViewSet,
    PayrollPeriodViewSet,
    SalarySlipViewSet,
    StaffAttendanceViewSet,
)
from .views_appraisal import AppraisalCycleViewSet, AppraisalFormViewSet

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet)
router.register(r"employees", EmployeeViewSet)
router.register(r"leave-types", LeaveTypeViewSet)
router.register(r"leaves", LeaveApplicationViewSet)
router.register(r"attendance", StaffAttendanceViewSet)
router.register(r"payroll-periods", PayrollPeriodViewSet)
router.register(r"salary-slips", SalarySlipViewSet)
router.register(r"dashboard", HRDashboardViewSet, basename="hr-dashboard")
router.register(r"appraisal-cycles", AppraisalCycleViewSet, basename="appraisal-cycle")
router.register(r"appraisals", AppraisalFormViewSet, basename="appraisal")

urlpatterns = [
    path("", include(router.urls)),
]
