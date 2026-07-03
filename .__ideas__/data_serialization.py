from __future__ import annotations

from abc import ABC
from pathlib import Path
from typing import Any, Callable, ClassVar, Iterable, Mapping

import csv
import io
import json
import xml.etree.ElementTree as ET

# ---------------------------
# Base Serializer (DRY core)
# ---------------------------


class Serializer(ABC):
    ENCODING: ClassVar[str] = "utf-8"
    NEWLINE: ClassVar[str] = ""

    loader: ClassVar[Callable[[str], Any]]
    dumper: ClassVar[Callable[[Any], str]]

    @classmethod
    def loads(cls, text: str) -> Any:
        return cls.loader(text)

    @classmethod
    def dumps(cls, data: Any) -> str:
        return cls.dumper(data)

    @classmethod
    def read_file(cls, path: str | Path, default: Any = None) -> Any:
        path = Path(path)
        if not path.exists():
            return default

        with path.open("r", encoding=cls.ENCODING, newline=cls.NEWLINE) as f:
            return cls.loads(f.read())

    @classmethod
    def write_file(cls, path: str | Path, data: Any) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with path.open("w", encoding=cls.ENCODING, newline=cls.NEWLINE) as f:
            f.write(cls.dumps(data))

    @classmethod
    def update_file(
        cls, path: str | Path, updates: Mapping[str, Any]
    ) -> dict[str, Any]:
        data = cls.read_file(path, default={})

        if not isinstance(data, dict):
            raise TypeError(f"{cls.__name__} only supports dict updates.")

        data.update(updates)
        cls.write_file(path, data)
        return data


# ---------------------------
# JSON
# ---------------------------


class Json(Serializer):
    loader = staticmethod(json.loads)

    @staticmethod
    def dumper(data: Any) -> str:
        return json.dumps(
            data,
            indent=4,
            ensure_ascii=False,
            sort_keys=True,
        )


# ---------------------------
# CSV
# ---------------------------


class Csv(Serializer):
    @staticmethod
    def loader(text: str) -> list[dict[str, str]]:
        return list(csv.DictReader(io.StringIO(text)))

    @staticmethod
    def dumper(rows: Iterable[Mapping[str, Any]]) -> str:
        rows = list(rows)
        if not rows:
            return ""

        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
        return buf.getvalue()


# ---------------------------
# XML (Hyperscript + dict adapter)
# ---------------------------

XmlNode = dict[str, Any]
# shape:
# {
#   "tag": str,
#   "attrs": dict,
#   "text": str | None,
#   "children": list[XmlNode]
# }


class Xml(Serializer):
    loader = staticmethod(lambda s: Xml._parse(ET.fromstring(s)))
    dumper = staticmethod(lambda d: Xml._render(d))

    # -------- public helpers --------

    @staticmethod
    def h(tag: str, *, attrs=None, text=None, children=None) -> XmlNode:
        return {
            "tag": tag,
            "attrs": attrs or {},
            "text": text,
            "children": children or [],
        }

    @staticmethod
    def from_dict(d: dict[str, Any]) -> XmlNode:
        """
        Normalize arbitrary dict into XmlNode shape.
        """
        return {
            "tag": d["tag"],
            "attrs": d.get("attrs", {}),
            "text": d.get("text"),
            "children": [Xml.from_dict(c) for c in d.get("children", [])],
        }

    # -------- serialization --------

    @staticmethod
    def _render(node: XmlNode | dict[str, Any]) -> str:
        node = Xml.from_dict(node) if isinstance(node, dict) else node

        def build(n: XmlNode) -> ET.Element:
            el = ET.Element(n["tag"], n.get("attrs", {}))

            if n.get("text") is not None:
                el.text = str(n["text"])

            for child in n.get("children", []):
                el.append(build(child))

            return el

        return ET.tostring(build(node), encoding="unicode")

    @staticmethod
    def _parse(el: ET.Element) -> XmlNode:
        return {
            "tag": el.tag,
            "attrs": dict(el.attrib),
            "text": el.text.strip() if el.text and el.text.strip() else None,
            "children": [Xml._parse(c) for c in list(el)],
        }


# ---------------------------
# Namespace
# ---------------------------


class Data:
    json = Json
    csv = Csv
    xml = Xml

    def __new__(cls):
        raise TypeError("Data is a static namespace.")


# ---------------------------
# Example usage
# ---------------------------

if __name__ == "__main__":
    from pathlib import Path

    THIS_DIR = Path(__file__).parent
    BASE_DIR = THIS_DIR / "data"

    # -----------------------
    # JSON
    # -----------------------
    Data.json.write_file(BASE_DIR / "config.json", {"name": "Alice"})
    config = Data.json.read_file(BASE_DIR / "config.json")

    Data.json.update_file(BASE_DIR / "config.json", {"age": 30})

    # -----------------------
    # CSV
    # -----------------------
    Data.csv.write_file(
        BASE_DIR / "users.csv",
        [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
        ],
    )

    # -----------------------
    # XML (raw dict also works now)
    # -----------------------

    raw_doc = {
        "tag": "Users",
        "children": [
            {"tag": "User", "attrs": {"id": "3"}, "text": "Charlie", "children": []}
        ],
    }

    Data.xml.write_file(BASE_DIR / "users.xml", raw_doc)

    # -----------------------
    # Readers
    # -----------------------

    config = Data.json.read_file(BASE_DIR / "config.json")
    crows = Data.csv.read_file(BASE_DIR / "users.csv")
    xrows = Data.xml.read_file(BASE_DIR / "users.xml")

    print(config)
    print(crows)
    print(xrows)
