from datetime import datetime, UTC
from uuid import uuid4
from dataclasses import fields

from demo.models import model, field


@model(is_abstract=True)
class Base:
    id: str = field(default=uuid4)


@model
class User(Base):
    name: str = field(
        default=None,
        cleanup=[lambda v: v.lower()],
        rules={"is_string": lambda v: isinstance(v, str)},
    )
    datetime: str = field(lambda: datetime.now(tz=UTC))


# Demo
print(User(name="john doe"))

# DataClass Metadata
print(getattr(Base, "__meta__"), getattr(User, "__meta__"))

# Fields
for f in fields(User):
    print(f.metadata)
