# Python-Typing

A tiny demo showing how to build your own `@dataclass`-style decorator and your own `field()` wrapper.

## Why?

Python's built-in `dataclasses.field` makes you choose between `default` and `default_factory`. That's annoying.

This project shows how to wrap it so **one `field()` handles both**. If you pass a callable, it becomes a factory. Otherwise it's a plain default. Same name, less thinking.

## What's inside

- A custom `@model` decorator (like `@dataclass`, but yours).
- A custom `field()` helper that smooths over `default` vs `default_factory`.
- **Field power-ups via metadata:** attach your own rules, cleanups, transformers or anything you want to each field. Think of it as giving every field little superpowers.

That's it. Open [main.py](main.py) to see it in action.

## Code cleanup

The repo ships with [scripts/cleanup.sh](scripts/cleanup.sh) — a one-shot script that runs a chain of tools to keep the code clean, consistent, and normalized:

- **ssort** — sorts top-level statements
- **isort** — sorts imports
- **black** + **ruff format** — formatting
- **mypy** — type checking
- **ruff check --fix** — lint + auto-fix
- **pylint** — extra linting

Run it with:

```bash
bash scripts/cleanup.sh
```
