from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Teacher, Student, AcademicClass, Subject

class AcademicStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        using_db = getattr(request, 'db_alias', 'default')
        tenant_id = request.headers.get('x-tenant-id', 'default')
        cache_key = f"academic_stats_{tenant_id}"
        
        from django.core.cache import cache
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return Response(cached_stats)
            
        stats = {
            'total_teachers': Teacher.objects.using(using_db).count(),
            'total_students': Student.objects.using(using_db).count(),
            'total_classes': AcademicClass.objects.using(using_db).count(),
            'total_subjects': Subject.objects.using(using_db).count(),
        }
        
        cache.set(cache_key, stats, 300) # Cache for 5 minutes
        return Response(stats)
