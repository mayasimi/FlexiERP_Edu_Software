# EduManage Mock Database Handoff

This file explains the normalized mock data in `lib/mock-database.ts`. It is designed to help the backend engineer create Laravel migrations, seeders, models, relationships, and API resources.

## Core Tables

- `roles`, `users`: authentication and authorization.
- `academic_terms`, `classes`, `sections`: school structure.
- `departments`, `staff`: staff directory and teacher payroll identity.
- `guardians`, `students`, `guardian_students`: parent/student relationships.
- `student_profiles`, `teacher_contacts`, `scheme_weeks`, `scheme_topics`, `student_projects`, `report_cards`, `parent_notifications`: student and parent dashboard data.
- `subjects`, `subject_assignments`: subject catalog and teacher/class assignment.
- `fee_types`, `invoices`, `invoice_items`, `fee_payments`: school fees and Paystack payment records.
- `payroll_periods`, `payroll_items`, `payroll_payments`: admin salary dashboard and payroll payment history.
- `attendance_records`, `timetable_periods`, `exams`, `exam_marks`: academic operations.
- `inventory_items`, `admissions`, `messages`, `notices`: other admin modules.

## Important Relationships

- `users.role_id -> roles.id`
- `staff.user_id -> users.id`
- `staff.department_id -> departments.id`
- `students.user_id -> users.id`
- `students.section_id -> sections.id`
- `guardian_students.guardian_id -> guardians.id`
- `guardian_students.student_id -> students.id`
- `student_profiles.student_id -> students.id`
- `teacher_contacts.staff_id -> staff.id`
- `teacher_contacts.section_id -> sections.id`
- `teacher_contacts.subject_id -> subjects.id`
- `scheme_weeks.section_id -> sections.id`
- `scheme_weeks.term_id -> academic_terms.id`
- `scheme_topics.scheme_week_id -> scheme_weeks.id`
- `scheme_topics.subject_id -> subjects.id`
- `scheme_topics.staff_id -> staff.id`
- `student_projects.student_id -> students.id`
- `student_projects.subject_id -> subjects.id`
- `student_projects.staff_id -> staff.id`
- `report_cards.student_id -> students.id`
- `report_cards.exam_id -> exams.id`
- `parent_notifications.guardian_id -> guardians.id`
- `parent_notifications.student_id -> students.id` when the notice belongs to one child.
- `sections.class_id -> classes.id`
- `sections.form_teacher_id -> staff.id`
- `subject_assignments.subject_id -> subjects.id`
- `subject_assignments.staff_id -> staff.id`
- `subject_assignments.section_id -> sections.id`
- `subject_assignments.term_id -> academic_terms.id`
- `invoices.student_id -> students.id`
- `invoice_items.invoice_id -> invoices.id`
- `fee_payments.invoice_id -> invoices.id`
- `payroll_items.payroll_period_id -> payroll_periods.id`
- `payroll_items.staff_id -> staff.id`
- `payroll_payments.staff_id -> staff.id`

## Suggested Payroll Endpoints

- `GET /api/payroll/dashboard`
  Returns the active payroll period, payroll items joined with staff, and recent payroll payments.

- `PATCH /api/payroll/items/{id}`
  Updates `current_pay`, `adjustment`, or `paid`.

- `POST /api/payroll/payments`
  Stores a successful Paystack payroll reference and marks selected payroll items as paid.

Example request:

```json
{
  "payroll_period_id": "payroll-2026-05",
  "staff_ids": ["staff-002", "staff-003"],
  "amount": 1025000,
  "method": "paystack",
  "reference": "PAYROLL-BULK-20260526"
}
```

## Suggested Fee Payment Endpoint

- `POST /api/fees/payments`
  Stores Paystack payment success for a student invoice.

Example request:

```json
{
  "invoice_id": "invoice-001",
  "student_id": "student-001",
  "amount": 50000,
  "method": "paystack",
  "reference": "PS-20260115-003"
}
```

## Suggested Student Dashboard Endpoints

- `GET /api/student/dashboard`
  Returns the authenticated student's profile, class, section, form teacher, timetable, subjects/marks, attendance summary, fees, report card, projects, and scheme of work.

- `GET /api/students/{student_id}/dashboard`
  Admin/parent-safe version of the same shape for a specific student.

- `GET /api/students/{student_id}/scheme-of-work`
  Returns weekly scheme records joined with topics, subjects, and teachers.

- `GET /api/students/{student_id}/projects`
  Returns assignments/projects with subject and teacher details.

- `GET /api/students/{student_id}/report-card?term_id=...`
  Returns report card remarks, position, class size, and subject marks.

The mock response shape is available in `mockApiResponses['/student/dashboard']`.

## Suggested Parent Dashboard Endpoints

- `GET /api/parent/dashboard`
  Returns the authenticated guardian, linked children, each child dashboard summary, parent notifications, and aggregate fee totals.

- `GET /api/parents/{guardian_id}/children`
  Returns all children connected through `guardian_students`.

- `GET /api/parents/{guardian_id}/notifications`
  Returns parent notifications joined to the affected child where applicable.

- `GET /api/parents/{guardian_id}/children/{student_id}/dashboard`
  Returns one child's student dashboard after confirming the guardian-child relationship.

The mock response shape is available in `mockApiResponses['/parent/dashboard']`.

## Notes

- Amounts are stored as integer naira values, not kobo. Convert to kobo only when sending to Paystack.
- Use `status` fields as enums in Laravel where possible.
- The mock API responses at the bottom of `lib/mock-database.ts` mirror the frontend endpoints already used in `lib/api.ts`.
