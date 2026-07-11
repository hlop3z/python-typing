## Integer

| Type     | Size   | Range                                                   |
| -------- | ------ | ------------------------------------------------------- |
| SMALLINT | 16-bit | -32,768 to 32,767                                       |
| INTEGER  | 32-bit | -2,147,483,648 to 2,147,483,647                         |
| BIGINT   | 64-bit | -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 |

---

## Float (Approximate / IEEE-754)

| Type             | Size   | Precision (approx) | Range                 |
| ---------------- | ------ | ------------------ | --------------------- |
| REAL             | 32-bit | ~6 decimal digits  | ±1.18e−38 to ±3.4e38  |
| DOUBLE PRECISION | 64-bit | ~15–17 digits      | ±2.2e−308 to ±1.8e308 |

> Note: floats are approximate, not exact (rounding errors are expected)

---

## Decimal (Exact)

| Type    | Storage  | Range / Precision                                                           |
| ------- | -------- | --------------------------------------------------------------------------- |
| NUMERIC | variable | Arbitrary precision (limited by declared precision/scale and system limits) |

Examples:

```sql
NUMERIC(10,2)   -- fixed-point decimal (e.g. money)
NUMERIC         -- unbounded precision (slower)
```

---

## Key corrections vs your original notes

- ❌ FLOAT ranges were incorrect (they are not ±2.1B or ±9e18)
- ❌ NUMERIC is not floating-point and has **no fixed “bit size range” like ints/floats**
- ✔ FLOAT = approximate binary floating point
- ✔ NUMERIC = exact decimal arithmetic (software-based)
