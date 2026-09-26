# Nexora Desk - API Design

## API Style

- REST API
- JSON Responses
- JWT Authentication
- Versioned APIs (/api/v1)

---

# Authentication

POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/forgot-password

POST /auth/reset-password

GET /auth/profile

---

# Users

GET /users

GET /users/:id

POST /users

PATCH /users/:id

DELETE /users/:id

---

# Organizations

GET /organizations

GET /organizations/:id

POST /organizations

PATCH /organizations/:id

DELETE /organizations/:id

---

# Customers

GET /customers

GET /customers/:id

POST /customers

PATCH /customers/:id

DELETE /customers/:id

---

# Tickets

GET /tickets

GET /tickets/:id

POST /tickets

PATCH /tickets/:id

DELETE /tickets/:id

POST /tickets/:id/assign

POST /tickets/:id/close

POST /tickets/:id/reopen

---

# Conversations

GET /conversations

GET /conversations/:id

POST /conversations

POST /conversations/:id/message

---

# Messages

GET /messages

GET /messages/:id

POST /messages

DELETE /messages/:id

---

# Attachments

POST /attachments

GET /attachments/:id

DELETE /attachments/:id

---

# AI

POST /ai/summarize

POST /ai/reply

POST /ai/sentiment

POST /ai/categorize

POST /ai/priority

---

# Reports

GET /reports/dashboard

GET /reports/daily

GET /reports/weekly

GET /reports/monthly

GET /reports/agents

---

# Notifications

GET /notifications

PATCH /notifications/:id/read

DELETE /notifications/:id