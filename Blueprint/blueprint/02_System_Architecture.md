# Nexora Desk - System Architecture

## Architecture Overview

Nexora Desk follows a Modular Monolith Architecture for the MVP.

This approach keeps development simple while allowing each module to evolve into a microservice in the future.

---

# High Level Architecture

Client (Next.js)

↓

API Gateway (NestJS)

↓

Business Modules

↓

Database (PostgreSQL)

↓

Redis + BullMQ

↓

External Integrations

- WhatsApp
- Telegram
- AI Provider

---

# Backend Modules

## Authentication

Responsibilities

- Login
- Logout
- JWT
- Refresh Tokens
- Permissions

---

## Users

Responsibilities

- User CRUD
- Roles
- Profile

---

## Organizations

Responsibilities

- Organization CRUD
- Teams
- Branches

---

## Customers

Responsibilities

- Customer Profiles
- Contact Information
- Ticket History

---

## Tickets

Responsibilities

- Ticket CRUD
- Assignment
- Status
- Priority
- Category
- Attachments

---

## Conversations

Responsibilities

- WhatsApp Messages
- Telegram Messages
- Internal Notes
- Message Timeline

---

## AI

Responsibilities

- Summaries
- Reply Suggestions
- Sentiment Analysis
- Ticket Categorization

---

## Reports

Responsibilities

- Dashboard Statistics
- Daily Reports
- Monthly Reports
- Agent Performance

---

## Notifications

Responsibilities

- In-App Notifications
- SLA Alerts
- Assignment Alerts

---

# External Services

- PostgreSQL
- Redis
- BullMQ
- MinIO
- Mailpit
- OpenAI (Initial AI Provider)

---

# Design Principles

- Modular
- Scalable
- Event Driven
- API First
- Documentation First