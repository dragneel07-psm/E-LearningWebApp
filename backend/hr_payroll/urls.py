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

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet)
router.register(r"employees", EmployeeViewSet)
router.register(r"leave-types", LeaveTypeViewSet)
router.register(r"leaves", LeaveApplicationViewSet)
router.register(r"attendance", StaffAttendanceViewSet)
router.register(r"payroll-periods", PayrollPeriodViewSet)
router.register(r"salary-slips", SalarySlipViewSet)
router.register(r"dashboard", HRDashboardViewSet, basename="hr-dashboard")

urlpatterns = [
    path("", include(router.urls)),
]
