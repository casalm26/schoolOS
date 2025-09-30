# User Journeys & Data Flow

This document summarises the end-to-end experience for teachers and students in **SchoolOS**, highlighting the data models and API touchpoints involved at each step. It reflects the tightened access controls introduced in this change-set to keep the workflows simple and predictable.

## Core Entities

- **User** – stored in `users` collection with role (`admin`, `teacher`, `student`) and status flags.
- **Programme & Cohort** – academic structures created by administrators; cohorts group classes by intake.
- **Class** – owned by a cohort, referenced by `ClassEntity` with an immutable `code` and an array of `instructorIds`.
- **Enrollment** – junction between a class and a student, tracking status (`active`, `completed`, `dropped`).
- **Assignment** – tasks tied to a class with schedule metadata (publish/due dates, grading schema).
- **Grade** – per-assignment record for an enrolled student with history trail and release status.

These entities are linked strictly through IDs, keeping the data model lean while enforcing role-based permissions at the service layer.

## Teacher Journey

1. **Authenticate**
   - Request: `POST /api/auth/login`
   - Response returns JWT + teacher profile. Token gate-keeps all protected routes.

2. **View Assigned Classes**
   - Request: `GET /api/classes`
   - Server auto-filters by `instructorIds` for the calling teacher, returning only their active classes along with codes and scheduling metadata.

3. **Inspect Roster**
   - Request: `GET /api/classes/:classId/enrollments`
   - Guard validates the teacher is assigned to the class before returning enrollments enriched with student directory info.

4. **Enroll a Student**
   - Request: `POST /api/classes/:classId/enrollments`
   - Payload accepts either `studentId` or `studentEmail`. The controller reuses the instructor guard to keep enrolments scoped to owned classes.

5. **Publish Assignments**
   - Request: `POST /api/classes/:classId/assignments`
   - Teachers can only create assignments for classes they teach; `ClassesService.ensureInstructorAccess` verifies ownership before persisting the record.

6. **Track Assignment List**
   - Request: `GET /api/classes/:classId/assignments`
   - Returns chronological list for UI dashboards (e.g. upcoming due date widgets).

7. **Grade Submissions**
   - Request: `POST /api/assignments/:assignmentId/grades`
   - Service verifies: (a) assignment exists, (b) student belongs to the class, and (c) instructor owns the class. Grade history captures author + timestamp for audit.

8. **Release Grades**
   - Request: `POST /api/grades/:gradeId/release`
   - Ownership check ensures teachers can only release grades for their classes. Release triggers NotificationsService to inform students.

## Student Journey

1. **Authenticate**
   - Request: `POST /api/auth/login`
   - Returns JWT + profile (role = `student`).

2. **See Personal Assignment Feed**
   - Request: `GET /api/students/:studentId/assignments`
   - Guard ensures students can only access their own ID. Response merges assignments from enrolled classes with grade status, due dates, and feedback.

3. **Review Grades**
   - Request: `GET /api/students/:studentId/grades`
   - Provides the grade ledger for transcripts and historical context.

4. **Class Visibility (Optional)**
   - A student’s classes are implicit via enrolments surfaced in assignment data. Additional roster visibility can be added later if needed, but the streamlined view keeps the dashboard focused on what matters now: upcoming work and released feedback.

## Structural Improvements Introduced

- **Instructor-scoped operations** – Teachers can now only list classes, manage enrolments, publish assignments, and adjust grades for classes they own. This keeps the workflow focused and prevents accidental cross-class edits.
- **Shared guard helper** – `ClassesService.ensureInstructorAccess` centralises the access rule so assignments and grades reuse the same logic, reducing drift.
- **Documented journey** – This page provides a canonical flow reference for onboarding and future product work.

These changes ensure teachers and students land in purpose-built workspaces that only surface the data they own, reinforcing a “dead simple” experience without compromising data boundaries.
