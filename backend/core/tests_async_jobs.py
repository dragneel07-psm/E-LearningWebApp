from django.test import SimpleTestCase, override_settings

from core.async_jobs import background_task, enqueue


@background_task(name="test.add")
def add_numbers(a: int, b: int) -> int:
    return a + b


class AsyncJobsFallbackTests(SimpleTestCase):
    @override_settings(ASYNC_TASK_BACKEND="sync")
    def test_enqueue_executes_task_synchronously_in_sync_mode(self):
        result = enqueue(add_numbers, 2, 3)
        self.assertEqual(result, 5)

    @override_settings(ASYNC_TASK_BACKEND="celery")
    def test_enqueue_falls_back_to_sync_when_celery_unavailable(self):
        # In current local test environment celery may be unavailable; fallback must still work.
        result = enqueue(add_numbers, 10, 5)
        self.assertEqual(result, 15)

