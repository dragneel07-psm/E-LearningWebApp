from rest_framework.routers import DefaultRouter
from .views import HostelBlockViewSet, HostelRoomViewSet, HostelAllotmentViewSet

router = DefaultRouter()
router.register(r'blocks', HostelBlockViewSet, basename='hostel-block')
router.register(r'rooms', HostelRoomViewSet, basename='hostel-room')
router.register(r'allotments', HostelAllotmentViewSet, basename='hostel-allotment')

urlpatterns = router.urls
