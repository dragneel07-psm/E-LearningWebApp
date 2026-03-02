from typing import Any, Dict, Optional


def derive_tenant_type_from_plan(plan) -> str:
    if not plan:
        return "standard"

    name = (getattr(plan, "name", "") or "").strip().lower()
    if "enterprise" in name:
        return "enterprise"
    if "premium" in name:
        return "premium"
    if "standard" in name or "basic" in name or "starter" in name:
        return "standard"

    student_limit = int(getattr(plan, "student_limit", 0) or 0)
    if student_limit >= 3000:
        return "enterprise"
    if student_limit >= 1000:
        return "premium"
    return "standard"


def get_tenant_plan(tenant) -> Optional[Any]:
    sub = getattr(tenant, "subscription", None)
    if sub and getattr(sub, "plan", None):
        return sub.plan
    return None


def build_plan_entitled_features(plan) -> Dict[str, bool]:
    if not plan:
        return {
            "student_ai_chatbot": False,
            "student_gamification": True,
            "teacher_ai_grading": False,
            "teacher_reports": False,
            "parent_attendance": False,
            "parent_fees": False,
            "student_career_guidance": False,
        }

    has_ai_tutor = bool(getattr(plan, "has_ai_tutor", False))
    has_ai_eval = bool(getattr(plan, "has_ai_eval", False))
    has_parent_portal = bool(getattr(plan, "has_parent_portal", False))
    has_analytics = bool(getattr(plan, "has_analytics", False))
    has_career_guidance = bool(getattr(plan, "has_career_guidance", False))

    return {
        "student_ai_chatbot": has_ai_tutor,
        "student_gamification": True,
        "teacher_ai_grading": has_ai_eval,
        "teacher_reports": has_analytics,
        "parent_attendance": has_parent_portal,
        "parent_fees": has_parent_portal,
        "student_career_guidance": has_career_guidance,
    }


def sync_tenant_with_plan(tenant, plan=None, save: bool = True):
    active_plan = plan or get_tenant_plan(tenant)
    tenant.type = derive_tenant_type_from_plan(active_plan)
    tenant.features = build_plan_entitled_features(active_plan)
    if save:
        tenant.save(update_fields=["type", "features"])
    return tenant


def sync_subscription_limits_with_plan(subscription, plan=None, save: bool = True):
    active_plan = plan or getattr(subscription, "plan", None)
    if not active_plan:
        return subscription

    subscription.student_limit = int(getattr(active_plan, "student_limit", 0) or 0)
    subscription.storage_limit_gb = int(getattr(active_plan, "storage_limit_gb", 0) or 0)
    subscription.ai_token_limit = int(getattr(active_plan, "ai_token_limit", 0) or 0)
    if save:
        subscription.save(update_fields=["student_limit", "storage_limit_gb", "ai_token_limit"])
    return subscription
