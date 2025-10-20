"""
Typed data utilities for Python 3.13+.

This module defines flexible type aliases for dataclasses and schemas,
allowing default `None` values for development ergonomics while keeping
the first type in the union as the "real" schema type.

Useful for schema introspection, form rendering, and model validation.
"""

from datetime import date, datetime, time
from decimal import Decimal as PyDecimal
from typing import Any, NewType, TypeAlias, Union, TypeVar, Optional

# ------------------------------------------------------------------------------
# Generic Types
# ------------------------------------------------------------------------------

T = TypeVar("T")

Type = Optional[T]
Many = Optional[list[T]]
Refs = Optional[list[Optional[T]]]


# ------------------------------------------------------------------------------
# Scalar Types
# ------------------------------------------------------------------------------


class Scalar:
    ID = NewType("ID", int)
    UUID = NewType("UUID", str)

    # Basic Types
    Int32 = NewType("Int32", int)
    Int64 = NewType("Int64", int)
    Float32 = NewType("Float32", float)
    Float64 = NewType("Float64", float)
    Decimal = NewType("Decimal", PyDecimal)
    String = NewType("String", str)
    Text = NewType("Text", str)
    Boolean = NewType("Boolean", bool)

    # Date and Time
    DateTime = NewType("DateTime", datetime)
    Date = NewType("Date", date)
    Time = NewType("Time", time)

    # JSON
    Dict = NewType("Dict", dict[str, Any])
    List = NewType("List", list[Any])

    # Complex
    Base64 = NewType("Base64", str)
    Binary = NewType("Binary", bytes)


# ------------------------------------------------------------------------------
# Type Aliases (with None for developer ergonomics)
# ------------------------------------------------------------------------------

# Generic JSON alias
JSON: TypeAlias = Union[str, int, float, bool, None, list, dict]

# Generic ID alias
ID: TypeAlias = Union[Scalar.ID, int, str, None]
UUID: TypeAlias = Union[Scalar.UUID, str, None]

# Basic Types
Int: TypeAlias = Union[Scalar.Int32, int, None]
Int64: TypeAlias = Union[Scalar.Int64, int, None]
Float: TypeAlias = Union[Scalar.Float32, float, None]
Float64: TypeAlias = Union[Scalar.Float64, float, None]
Decimal: TypeAlias = Union[Scalar.Decimal, PyDecimal, None]
String: TypeAlias = Union[Scalar.String, str, None]
Text: TypeAlias = Union[Scalar.Text, str, None]
Boolean: TypeAlias = Union[Scalar.Boolean, bool, None]

# Date and Time
DateTime: TypeAlias = Union[Scalar.DateTime, datetime, None]
Date: TypeAlias = Union[Scalar.Date, date, None]
Time: TypeAlias = Union[Scalar.Time, time, None]

# JSON
Dict: TypeAlias = Union[Scalar.Dict, dict[str, JSON], None]
List: TypeAlias = Union[Scalar.List, list[JSON], None]

# Complex
Base64: TypeAlias = Union[Scalar.Base64, str, None]
Binary: TypeAlias = Union[Scalar.Binary, bytes, None]


# ------------------------------------------------------------------------------
# Exported Symbols
# ------------------------------------------------------------------------------

__all__ = (
    "Int",
    "Int64",
    "Float",
    "Float64",
    "PyDecimal",
    "String",
    "Text",
    "Boolean",
    # Complex
    "Base64",
    "Binary",
    # Date and Time
    "DateTime",
    "Date",
    "Time",
    # JSON
    "Dict",
    "List",
    # IDs
    "ID",
    "UUID",
    # Other
    "Refs",
    "Many",
    "Type",
)
