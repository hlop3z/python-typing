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
