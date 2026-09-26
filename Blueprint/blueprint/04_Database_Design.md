# Nexora Desk - Database Design

## Database

PostgreSQL

ORM: Prisma

---

# Tables

## users

- id
- firstName
- lastName
- email
- password
- roleId
- organizationId
- createdAt
- updatedAt

---

## roles

- id
- name
- description

---

## organizations

- id
- name
- logo
- domain
- createdAt

---

## customers

- id
- organizationId
- name
- email
- phone
- createdAt

---

## tickets

- id
- customerId
- assignedTo
- title
- description
- status
- priority
- category
- source
- createdAt
- updatedAt

---

## conversations

- id
- ticketId
- channel
- createdAt

---

## messages

- id
- conversationId
- sender
- message
- attachment
- createdAt

---

## attachments

- id
- ticketId
- filename
- url

---

## ai_logs

- id
- ticketId
- summary
- sentiment
- reply
- createdAt

---

# Relationships

Organization

↓

Users

↓

Customers

↓

Tickets

↓

Conversations

↓

Messages