# CRUD (REST)

## Create

| Method | Endpoint     | Usage today    | Notes                 |
| ------ | ------------ | -------------- | --------------------- |
| POST   | `/resources` | ⭐ Most common | Create a new resource |

Example:

```http
POST /users
{
  "name": "Alice",
  "email": "alice@email.com"
}
```

---

## Read

| Method | Endpoint          | Usage today    | Notes                    |
| ------ | ----------------- | -------------- | ------------------------ |
| GET    | `/resources`      | ⭐ Most common | List resources           |
| GET    | `/resources/{id}` | ⭐ Most common | Retrieve single resource |

Examples:

```http
GET /users
GET /users/123
```

---

## Update

| Method | Endpoint          | Usage today    | Notes            |
| ------ | ----------------- | -------------- | ---------------- |
| PATCH  | `/resources/{id}` | ⭐ Most common | Partial update   |
| PUT    | `/resources/{id}` | Common         | Full replacement |

Examples:

```http
PATCH /users/123
{
  "email": "new@email.com"
}
```

```http
PUT /users/123
{
  "id": 123,
  "name": "Alice",
  "email": "new@email.com"
}
```

---

## Delete

| Method | Endpoint          | Usage today    | Notes             |
| ------ | ----------------- | -------------- | ----------------- |
| DELETE | `/resources/{id}` | ⭐ Most common | Remove a resource |

Example:

```http
DELETE /users/123
```

---

# Summary (modern REST defaults)

- **POST** → create
- **GET** → read
- **PATCH** → update (default choice)
- **PUT** → replace
- **DELETE** → remove
