# Agents Guide

## Authenticated Session Management
- Always acquire a JWT by calling `POST /api/auth/login` (or `POST /api/auth/register-admin` for first-run setup).
- Attach the token as `Authorization: Bearer <token>` for all protected routes.
- Supported roles: `admin`, `teacher`, `student`; endpoints enforce role-based access via guards.

## Key Workflows
- **User provisioning**: `POST /api/users` (admin-only) with `{ name, email, role, password }`. Search teachers/students via `/api/users/search/by-role` before enrollment.
- **Class setup**: Admin creates programmes, cohorts, and classes; teachers fetch `/api/classes` (auto-filtered to their assignments).
- **Assignments & grading**: Teachers manage `/api/classes/:id/assignments` and `/api/assignments/:id/grades`; use `/api/grades/:gradeId/release` to trigger notifications.
- **Student view**: Students call `/api/students/me/assignments` (or `/api/students/:id/assignments` with matching ID) to see status and released grades.

## Notifications & Audit
- Grade release automatically queues notifications via the NotificationsService.
- Grade history is embedded under each grade record, logging status transitions and actors.

## Local Ops
- Environment variables: `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NEXT_PUBLIC_API_BASE_URL`.
- Seeding demo data: `npm run seed` (root) to create admin/teacher/student accounts and a sample programme.
- Health check endpoint: `GET /api/health` for uptime monitoring.

## Testing & Tooling
- Backend tests: `npm --prefix server test`.
- Frontend production build: `npm --prefix client run build`.
- Full lint: `npm run lint` (runs both backend ESLint and Next.js lint).

Follow these conventions when creating new agents or automation scripts to keep auth, RBAC, and notification flows intact.
