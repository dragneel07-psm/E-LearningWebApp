# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from .academic import AcademicYearSerializer, AcademicClassSerializer, SectionSerializer, SubjectSerializer
from .profiles import (
    TeacherSerializer, 
    StudentListSerializer, 
    StudentDetailSerializer, 
    StudentCreateSerializer, 
    StudentUpdateSerializer,
    ParentSerializer
)
from .notice import NoticeSerializer
from .admission import AdmissionEnquirySerializer
