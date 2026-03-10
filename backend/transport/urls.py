from rest_framework.routers import DefaultRouter
from .views import RouteViewSet, VehicleViewSet, StudentTransportAssignmentViewSet

router = DefaultRouter()
router.register(r'routes', RouteViewSet, basename='route')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'assignments', StudentTransportAssignmentViewSet, basename='transport-assignment')

urlpatterns = router.urls
