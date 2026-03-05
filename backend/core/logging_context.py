from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
import logging


_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
_tenant_schema_ctx: ContextVar[str] = ContextVar("tenant_schema", default="-")
_tenant_id_ctx: ContextVar[str] = ContextVar("tenant_id", default="-")


@dataclass(frozen=True)
class RequestLogContext:
    request_id: str = "-"
    tenant_schema: str = "-"
    tenant_id: str = "-"


def set_request_context(
    *,
    request_id: str | None = None,
    tenant_schema: str | None = None,
    tenant_id: str | None = None,
) -> None:
    if request_id is not None:
        _request_id_ctx.set(str(request_id or "-"))
    if tenant_schema is not None:
        _tenant_schema_ctx.set(str(tenant_schema or "-"))
    if tenant_id is not None:
        _tenant_id_ctx.set(str(tenant_id or "-"))


def reset_request_context() -> None:
    _request_id_ctx.set("-")
    _tenant_schema_ctx.set("-")
    _tenant_id_ctx.set("-")


def get_request_context() -> RequestLogContext:
    return RequestLogContext(
        request_id=_request_id_ctx.get(),
        tenant_schema=_tenant_schema_ctx.get(),
        tenant_id=_tenant_id_ctx.get(),
    )


class RequestContextLogFilter(logging.Filter):
    """
    Enriches every log line with request correlation and tenant context.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        context = get_request_context()
        record.request_id = context.request_id
        record.tenant_schema = context.tenant_schema
        record.tenant_id = context.tenant_id
        return True
