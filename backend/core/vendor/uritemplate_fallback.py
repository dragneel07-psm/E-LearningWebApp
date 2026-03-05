"""
Minimal fallback for DRF OpenAPI generation when `uritemplate` is unavailable.
"""

from __future__ import annotations

import re


_VARIABLE_PATTERN = re.compile(r"\{([^{}]+)\}")


def variables(template: str) -> list[str]:
    return [match.group(1).strip() for match in _VARIABLE_PATTERN.finditer(str(template or ""))]


def expand(template: str, values: dict | None = None) -> str:
    if not values:
        return str(template or "")

    def _replace(match: re.Match) -> str:
        key = match.group(1).strip()
        return str(values.get(key, match.group(0)))

    return _VARIABLE_PATTERN.sub(_replace, str(template or ""))

