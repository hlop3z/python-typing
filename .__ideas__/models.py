"""
Model/Types utilities for Python 3.13+.

Useful for schema introspection, form rendering, and model validation.
"""

from typing import (
    Any,
    Union,
    get_args,
    get_origin,
    List,
    Type,
    Callable,
    ClassVar,
    ForwardRef,
)
from dataclasses import (
    dataclass as dc_dataclass,
    field as dc_field,
    fields,
    is_dataclass,
    Field,
)
from types import UnionType
from collections import OrderedDict

try:
    from typing import dataclass_transform  # Python 3.12+
except ImportError:
    from typing_extensions import dataclass_transform


# ------------------------------------------------------------------------------
# Strongly-Typed Aliases
# ------------------------------------------------------------------------------
@dc_dataclass
class Annotation:
    type: str
    many: bool
    refs: bool
    conf: Field | None = None

    @property
    def meta(self) -> dict[str, Any]:
        return dict(self.conf.metadata) if self.conf else {}


# ------------------------------------------------------------------------------
# Schema Type Introspection
# ------------------------------------------------------------------------------


def get_annotations_type_name(real_type: Any, is_ref: bool) -> str:
    """Get the name of the type, handling ForwardRef and Union types."""
    if is_ref:
        return str(real_type.__forward_arg__)
    if hasattr(real_type, "__name__"):
        return str(real_type.__name__)
    return str(real_type)  # Fallback for complex types like generics


def resolve_real_type(annot: Any) -> tuple[bool, Any, bool]:
    """
    Resolves the real type from an annotation.
    """
    origin = get_origin(annot)
    args = get_args(annot)

    # Case 1: Union[...] (e.g., Optional[X])
    if origin is Union:
        for arg in args:
            if arg is not type(None):
                return resolve_real_type(arg)

    # Case 2: list[...] or List[...]
    if origin in (list, List):
        inner = args[0] if args else Any
        _, real_type, is_ref = resolve_real_type(inner)
        return True, real_type, is_ref

    # Case 3.1: ForwardRef or custom model class
    is_ref = False
    is_many = False

    # Case 3.2: Nested types
    if isinstance(annot, ForwardRef):
        is_ref = True

    return is_many, annot, is_ref


def get_all_annotations(
    cls: Type[Any],
) -> tuple[OrderedDict[str, Any], OrderedDict[str, Field[Any]]]:
    annotations = OrderedDict()
    field_values = OrderedDict()

    for base in reversed(cls.__mro__):
        if not is_dataclass(base):
            continue
        for f in fields(base):
            annotations[f.name] = f.type
            field_values[f.name] = f  # includes default, default_factory, etc.

    return annotations, field_values


def get_annotations(cls: Type[Any]) -> OrderedDict[str, Annotation]:
    """
    Extracts schema metadata from dataclass annotations.
    """
    annotations = OrderedDict()
    schema, all_fields = get_all_annotations(cls)

    for name, annot in schema.items():
        many, real_type, is_ref = resolve_real_type(annot)
        annotations[name] = Annotation(
            type=get_annotations_type_name(real_type, is_ref), many=many, refs=is_ref
        )

    for name in annotations.keys():
        current = all_fields[name]
        annotations[name].conf = current

    return annotations


# ------------------------------------------------------------------------------
# Dataclass Decorator
# ------------------------------------------------------------------------------


@dataclass_transform()
def dataclass(
    _cls: Type[Any] | None = None, *, name: str | None = None, is_active: bool = True
) -> Callable[[Type[Any]], Type[Any]]:
    """Custom dataclass decorator with optional metadata."""

    def wrap(cls: Type[Any]) -> Type[Any]:
        print(
            f"[my_dataclass] Decorating: {cls.__name__}, name={name}, active={is_active}"
        )
        dataclass_cls = dc_dataclass(cls)
        dataclass_cls.__schema__ = get_annotations(dataclass_cls)
        return dataclass_cls

    return wrap if _cls is None else wrap(_cls)


def field(default: Any = None, meta: dict[str, Any] | None = None) -> Any:
    """Wrapper for dataclass fields supporting default factories."""
    if callable(default):
        return dc_field(default_factory=default, metadata=meta)
    return dc_field(default=default, metadata=meta)


# ------------------------------------------------------------------------------
# Exported Symbols
# ------------------------------------------------------------------------------

__all__ = ("dataclass", "field")

# ------------------------------------------------------------------------------
# Example Usage
# ------------------------------------------------------------------------------

if __name__ == "__main__":
    import data_types as t

    @dataclass
    class BaseModel:
        id: t.Int = field(default=None, meta={"some": "meta"})

        __schema__: ClassVar[OrderedDict[str, Annotation]] = OrderedDict()

    @dataclass
    class Model(BaseModel):
        created_at: t.DateTime = None
        updated_at: t.DateTime = None
        deleted_at: t.DateTime = None

    @dataclass
    class MyModel(Model):
        name: t.String = None
        age: t.Int = None
        email: t.String = None
        is_active: t.Boolean = None
        notes: t.Many[t.Text] = field(default=list)
        notes_model: t.Refs["SomeModel"] = field(default=list)
        other_model: t.Type["SomeModel"] = None

    @dataclass
    class SomeModel:
        id: t.Int = None

    demo = MyModel(
        id=1,
        name="John",
        age=30,
        email="john@example.com",
        is_active=True,
        notes_model=[SomeModel(id=1)],
    )

    from pprint import pprint

    schema = MyModel.__schema__
    # pprint(schema)
    for name, annot in schema.items():
        pprint(
            OrderedDict(
                name=name,
                type=annot.type,
                many=annot.many,
                refs=annot.refs,
                meta=annot.meta,
            )
        )
        print()

    # pprint(demo)
