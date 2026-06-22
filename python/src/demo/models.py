"""Dataclass-based model and field helpers."""

from dataclasses import dataclass as dc_dataclass
from dataclasses import field as dc_field
from typing import dataclass_transform  # Python 3.12+
from typing import Any, Callable, TypeVar, overload

# ---------------------------------------------------------------------------
# Generics
# ---------------------------------------------------------------------------

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


@overload
def model(
    _cls: None = None,
    *,
    is_abstract: bool = False,
) -> Callable[[type[T]], type[T]]: ...


@overload
def model(
    _cls: type[T],
    *,
    is_abstract: bool = False,
) -> type[T]: ...


@dataclass_transform()
def model(
    _cls: type[T] | None = None,
    *,
    is_abstract: bool = False,
) -> type[T] | Callable[[type[T]], type[T]]:
    """DataClass Creator"""

    def decorator(cls: type[T]) -> type[T]:
        dataclass_cls = dc_dataclass(cls, eq=False)
        setattr(dataclass_cls, "__meta__", {"is_abstract": is_abstract})
        return dataclass_cls

    return decorator if _cls is None else decorator(_cls)


# ---------------------------------------------------------------------------
# Fields
# ---------------------------------------------------------------------------


def field(
    default: Any = None,
    cleanup: list[Callable] | None = None,
    rules: dict[str, Callable] | None = None,
) -> Any:
    """DataClass Field"""
    meta: dict[str, Any] = {"cleanup": cleanup, "rules": rules}
    return (
        dc_field(default_factory=default, metadata=meta)
        if callable(default)
        else dc_field(default=default, metadata=meta)
    )
