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

| Operation   | HTTP     | Typical endpoint                      | Purpose                                                  | Request body                               | Typical response                 |
| ----------- | -------- | ------------------------------------- | -------------------------------------------------------- | ------------------------------------------ | -------------------------------- |
| **CREATE**  | `POST`   | `POST /users`                         | Create a new resource                                    | New resource fields                        | `201 Created` + created resource |
| **READ**    | `GET`    | `GET /users/123`                      | Retrieve one resource                                    | None                                       | `200 OK` + resource              |
| **UPDATE**  | `PATCH`  | `PATCH /users/123`                    | Partially modify an existing resource                    | Fields to change                           | `200 OK` or `204 No Content`     |
| **REPLACE** | `PUT`    | `PUT /users/123`                      | Completely replace an existing resource                  | Full resource representation               | `200 OK` or `204 No Content`     |
| **DELETE**  | `DELETE` | `DELETE /users/123`                   | Permanently remove a resource                            | Usually none                               | `204 No Content`                 |
| **FILTER**  | `GET`    | `GET /users?status=active&role=admin` | Retrieve a collection matching criteria                  | None; filters in query parameters          | `200 OK` + collection            |
| **ARCHIVE** | `PATCH`  | `PATCH /users/123`                    | Soft-delete / mark resource inactive without removing it | Archive fields, e.g. `{"archived": true}`  | `200 OK` or `204 No Content`     |
| **RESTORE** | `PATCH`  | `PATCH /users/123`                    | Reverse an archive/soft-delete                           | Restore fields, e.g. `{"archived": false}` | `200 OK` or `204 No Content`     |

```py
HTTP_METHOD = {
    "create": "POST",
    "read": "GET",
    "update": "PATCH",
    "replace": "PUT",
    "delete": "DELETE",
    "filter": "GET",
    "archive": "PATCH",
    "restore": "PATCH",
}
```
