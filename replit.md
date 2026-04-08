# CoreHR — Enterprise ERP System

## Overview
A full-stack enterprise HR/ERP system with a dark-themed React frontend and a Node.js/Express REST API backend, connected to a PostgreSQL database via Drizzle ORM.

## Architecture

### Monorepo Structure (pnpm workspace)
- `artifacts/api-server` — Express + TypeScript REST API (`@workspace/api-server`)
- `artifacts/erp` — React + Vite + TypeScript frontend (`@workspace/erp`)
- `lib/db` — Drizzle ORM schema + DB client (`@workspace/db`)
- `lib/api-spec` — OpenAPI 3.0 spec (`lib/api-spec/openapi.yaml`)
- `lib/api-client-react` — Orval-generated React Query hooks (`@workspace/api-client-react`)
- `lib/api-zod` — Orval-generated Zod request schemas (`@workspace/api-zod`)

### Platform Routing
- `/` → ERP frontend (port 18996 in dev)
- `/api/*` → API server (port 8080 in dev)

## Database (PostgreSQL via Replit built-in)
Tables: `users`, `departments`, `attendance`, `leave_applications`, `leave_balances`, `complaints`, `requests`, `payroll_records`, `projects`, `tasks`, `task_comments`, `notifications`, `company_settings`, `audit_logs`

Push schema: `pnpm --filter @workspace/db run push`

## Authentication
- JWT tokens, stored in localStorage as `erp_token`
- Sent as `Authorization: Bearer <token>` header
- Secret: `SESSION_SECRET` environment variable (fallback: `erp-secret-key`)

## Default Credentials (password: `Admin@1234`)
| Email | Role | Notes |
|-------|------|-------|
| superadmin@gmail.com | Super Admin | Full access |
| admin@gmail.com | Admin | Web department |
| employee@gmail.com | Employee | Sample employee (Jane Smith) |

## Roles & Permissions
- **super_admin**: Full access to everything including settings, audit log, payroll approval, all departments
- **admin**: Manage their department — employees, leave, complaints, requests, payroll records
- **employee**: Self-service — clock in/out, apply leave, submit complaints/requests, view own tasks

## API Modules (80+ endpoints)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `/api/users` — CRUD + stats + deactivate
- `/api/departments` — CRUD
- `/api/attendance` — clock in/out, today's record, history, monthly summary
- `/api/leave` — applications, review (approve/reject), leave balances
- `/api/complaints` — submit, update status/response
- `/api/requests` — submit, review
- `/api/payroll` — records, approve, summary by department
- `/api/projects` — CRUD
- `/api/tasks` — CRUD, comments
- `/api/notifications` — list, mark read, broadcast
- `/api/reports/dashboard`, `/api/reports/attendance`, `/api/reports/leave`, `/api/reports/payroll`
- `/api/settings` — company settings
- `/api/audit` — audit log (super_admin only)

## Frontend Pages
All pages use Orval-generated React Query hooks for data fetching. Auth token is automatically attached via `setAuthTokenGetter` in the custom fetch layer.

- `/login` — Auth page
- `/` — Role-aware dashboard with stats and recent activity
- `/employees`, `/employees/:id`, `/employees/new` — Employee directory and management
- `/departments` — Department overview
- `/attendance`, `/attendance/portal` — Attendance log + self-service clock in/out
- `/leave`, `/leave/apply`, `/leave/:id` — Leave management
- `/complaints`, `/complaints/submit`, `/complaints/:id` — Complaint system
- `/requests`, `/requests/submit`, `/requests/:id` — Request system
- `/payroll`, `/payroll/new`, `/payroll/:id` — Payroll records and payslips
- `/projects`, `/projects/:id` — Projects with kanban task board
- `/tasks`, `/tasks/:id` — Task management with comments
- `/notifications` — Notification center
- `/reports` — Attendance, leave, payroll reports with Recharts
- `/settings` — Company settings (super_admin only)
- `/audit` — Audit log (super_admin only)
- `/profile` — User profile + password change

## Key Dependencies
- Backend: Express 5, Drizzle ORM, bcryptjs, jsonwebtoken, pino
- Frontend: React 18, Vite, Tailwind CSS, React Query (TanStack), react-hook-form, Zod, wouter, Recharts, lucide-react, sonner, Radix UI
- Codegen: Orval (React Query hooks + Zod schemas from OpenAPI spec)

## Re-seeding the Database
```bash
cd artifacts/api-server && npx tsx src/seed.ts
```

## Regenerating API Client
```bash
pnpm --filter @workspace/api-spec run codegen
```
