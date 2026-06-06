/**
 * Backend handoff mock database for EduManage.
 *
 * The data is intentionally normalized so a Laravel backend engineer can map it
 * directly into migrations, seeders, Eloquent models, and API resources.
 */

export const mockDatabase = {
  roles: [
    { id: 'role-admin', name: 'admin', label: 'Administrator' },
    { id: 'role-teacher', name: 'teacher', label: 'Teacher' },
    { id: 'role-parent', name: 'parent', label: 'Parent' },
    { id: 'role-student', name: 'student', label: 'Student' },
  ],

  users: [
    { id: 'user-admin-001', role_id: 'role-admin', name: 'Admin User', email: 'admin@edumanage.edu', status: 'active' },
    { id: 'user-teacher-001', role_id: 'role-teacher', name: 'Dr. Sarah Jenkins', email: 's.jenkins@edumanage.edu', status: 'active' },
    { id: 'user-teacher-002', role_id: 'role-teacher', name: 'Prof. Robert Chen', email: 'r.chen@edumanage.edu', status: 'active' },
    { id: 'user-parent-001', role_id: 'role-parent', name: 'Mrs. Ada Okafor', email: 'parent.okafor@example.com', status: 'active' },
    { id: 'user-student-001', role_id: 'role-student', name: 'Chidinma Okafor', email: 'chidinma.okafor@example.com', status: 'active' },
    { id: 'user-student-002', role_id: 'role-student', name: 'Emeka Okafor', email: 'emeka.okafor@example.com', status: 'active' },
    { id: 'user-student-003', role_id: 'role-student', name: 'Blessing Okafor', email: 'blessing.okafor@example.com', status: 'active' },
  ],

  academic_terms: [
    { id: 'term-2025-2026-1', name: '1st Term', session: '2025/2026', starts_at: '2025-09-08', ends_at: '2025-12-12', status: 'completed' },
    { id: 'term-2025-2026-2', name: '2nd Term', session: '2025/2026', starts_at: '2026-01-12', ends_at: '2026-04-10', status: 'active' },
    { id: 'term-2025-2026-3', name: '3rd Term', session: '2025/2026', starts_at: '2026-05-04', ends_at: '2026-07-24', status: 'upcoming' },
  ],

  classes: [
    { id: 'class-ss2', name: 'SS2', level: 'Senior Secondary', capacity: 120 },
    { id: 'class-jss1', name: 'JSS1', level: 'Junior Secondary', capacity: 100 },
    { id: 'class-pry4', name: 'Primary 4', level: 'Primary School', capacity: 80 },
  ],

  sections: [
    { id: 'section-ss2a', class_id: 'class-ss2', name: 'A', capacity: 40, form_teacher_id: 'staff-001' },
    { id: 'section-jss1b', class_id: 'class-jss1', name: 'B', capacity: 35, form_teacher_id: 'staff-002' },
    { id: 'section-pry4a', class_id: 'class-pry4', name: 'A', capacity: 30, form_teacher_id: 'staff-003' },
  ],

  departments: [
    { id: 'dept-math', name: 'Mathematics Dept.' },
    { id: 'dept-science', name: 'Science Dept.' },
    { id: 'dept-admin', name: 'Administration' },
    { id: 'dept-english', name: 'English Dept.' },
  ],

  staff: [
    {
      id: 'staff-001',
      user_id: 'user-teacher-001',
      department_id: 'dept-math',
      employee_no: 'EMP-001',
      name: 'Dr. Sarah Jenkins',
      role: 'Head of Mathematics',
      email: 's.jenkins@edumanage.edu',
      phone: '+234 801 234 5678',
      status: 'active',
      hired_at: '2018-09-12',
      bank_name: 'First National Bank',
      account_number: '0123456789',
      base_pay: 620000,
    },
    {
      id: 'staff-002',
      user_id: 'user-teacher-002',
      department_id: 'dept-science',
      employee_no: 'EMP-002',
      name: 'Prof. Robert Chen',
      role: 'Senior Lecturer',
      email: 'r.chen@edumanage.edu',
      phone: '+234 802 345 6789',
      status: 'active',
      hired_at: '2020-01-05',
      bank_name: 'Cedar Trust Bank',
      account_number: '0987654321',
      base_pay: 565000,
    },
    {
      id: 'staff-003',
      user_id: null,
      department_id: 'dept-admin',
      employee_no: 'EMP-003',
      name: 'Elena Rostova',
      role: 'Academic Coordinator',
      email: 'e.rostova@edumanage.edu',
      phone: '+234 803 456 7890',
      status: 'on_leave',
      hired_at: '2021-03-20',
      bank_name: 'Metro Credit Union',
      account_number: '0011223344',
      base_pay: 475000,
    },
  ],

  guardians: [
    { id: 'guardian-001', user_id: 'user-parent-001', name: 'Mrs. Ada Okafor', email: 'parent.okafor@example.com', phone: '+234 802 345 6789', address: '12 Admiralty Way, Lekki, Lagos' },
  ],

  students: [
    {
      id: 'student-001',
      user_id: 'user-student-001',
      section_id: 'section-ss2a',
      admission_no: 'GFA-SS2-0047',
      name: 'Chidinma Okafor',
      gender: 'female',
      date_of_birth: '2009-05-12',
      status: 'active',
      admitted_at: '2023-09-04',
    },
    {
      id: 'student-002',
      user_id: 'user-student-002',
      section_id: 'section-jss1b',
      admission_no: 'GFA-JSS1-0112',
      name: 'Emeka Okafor',
      gender: 'male',
      date_of_birth: '2013-10-05',
      status: 'active',
      admitted_at: '2025-09-08',
    },
    {
      id: 'student-003',
      user_id: 'user-student-003',
      section_id: 'section-pry4a',
      admission_no: 'GFA-PRI4-0203',
      name: 'Blessing Okafor',
      gender: 'female',
      date_of_birth: '2016-02-18',
      status: 'active',
      admitted_at: '2024-09-09',
    },
  ],

  guardian_students: [
    { guardian_id: 'guardian-001', student_id: 'student-001', relationship: 'mother', is_primary: true },
    { guardian_id: 'guardian-001', student_id: 'student-002', relationship: 'mother', is_primary: true },
    { guardian_id: 'guardian-001', student_id: 'student-003', relationship: 'mother', is_primary: true },
  ],

  student_profiles: [
    { student_id: 'student-001', display_class: 'SS2A', level: 'Senior Secondary', avatar: 'CO', house: 'Eagles House', class_position: 4, previous_position: 6, class_size: 38 },
    { student_id: 'student-002', display_class: 'JSS1B', level: 'Junior Secondary', avatar: 'EO', house: 'Falcons House', class_position: 9, previous_position: 11, class_size: 35 },
    { student_id: 'student-003', display_class: 'Primary 4', level: 'Primary School', avatar: 'BO', house: 'Eagles House', class_position: 2, previous_position: 3, class_size: 28 },
  ],

  subjects: [
    { id: 'subject-math', code: 'MTH', name: 'Mathematics', department_id: 'dept-math', status: 'active' },
    { id: 'subject-english', code: 'ENG', name: 'English Language', department_id: 'dept-english', status: 'active' },
    { id: 'subject-physics', code: 'PHY', name: 'Physics', department_id: 'dept-science', status: 'active' },
  ],

  subject_assignments: [
    { id: 'assign-001', subject_id: 'subject-math', staff_id: 'staff-001', section_id: 'section-ss2a', term_id: 'term-2025-2026-2' },
    { id: 'assign-002', subject_id: 'subject-physics', staff_id: 'staff-002', section_id: 'section-ss2a', term_id: 'term-2025-2026-2' },
  ],

  teacher_contacts: [
    { id: 'contact-001', staff_id: 'staff-001', section_id: 'section-ss2a', subject_id: 'subject-math', type: 'form_teacher', consultation: 'Wed 2pm - 4pm', office: 'Staff Wing, Room 204' },
    { id: 'contact-002', staff_id: 'staff-001', section_id: 'section-ss2a', subject_id: 'subject-math', type: 'subject_teacher', consultation: 'Tue 1pm - 2pm', office: 'Math Office' },
    { id: 'contact-003', staff_id: 'staff-002', section_id: 'section-ss2a', subject_id: 'subject-physics', type: 'subject_teacher', consultation: 'Thu 12pm - 1pm', office: 'Science Lab Office' },
  ],

  scheme_weeks: [
    { id: 'scheme-week-001', section_id: 'section-ss2a', term_id: 'term-2025-2026-2', week_no: 1, title: 'Week 1', theme: 'Foundations & Review' },
    { id: 'scheme-week-002', section_id: 'section-ss2a', term_id: 'term-2025-2026-2', week_no: 2, title: 'Week 2', theme: 'Algebra & Literary Devices' },
    { id: 'scheme-week-003', section_id: 'section-ss2a', term_id: 'term-2025-2026-2', week_no: 3, title: 'Week 3', theme: 'Trigonometry & Grammar' },
  ],

  scheme_topics: [
    {
      id: 'scheme-topic-001',
      scheme_week_id: 'scheme-week-001',
      subject_id: 'subject-math',
      staff_id: 'staff-001',
      topic: 'Revision of Quadratic Expressions and Factorization',
      objective: 'Solve quadratic problems accurately and show full working steps.',
      activity: 'Guided examples, paired drills, board practice, and independent exercises.',
      resources: 'New General Mathematics, graph sheets, calculator, and past-question booklet.',
      assessment: 'Classwork checks, correction notebook, and short quiz.',
      homework: 'Complete the workbook exercise on factorization.',
    },
    {
      id: 'scheme-topic-002',
      scheme_week_id: 'scheme-week-001',
      subject_id: 'subject-physics',
      staff_id: 'staff-002',
      topic: 'Motion in a Straight Line',
      objective: 'Interpret distance-time and velocity-time graphs.',
      activity: 'Teacher demonstration, graph interpretation, and calculation practice.',
      resources: 'Physics textbook, graph book, measuring instruments, and formula sheet.',
      assessment: 'Calculation task, graph exercise, and weekly quiz.',
      homework: 'Solve five graph interpretation questions.',
    },
  ],

  fee_types: [
    { id: 'fee-tuition-ss2', name: 'School Fees', class_id: 'class-ss2', amount: 85000, term_id: 'term-2025-2026-2', status: 'active' },
    { id: 'fee-pta-ss2', name: 'PTA Levy', class_id: 'class-ss2', amount: 5000, term_id: 'term-2025-2026-2', status: 'active' },
    { id: 'fee-waec-ss2', name: 'WAEC Examination Levy', class_id: 'class-ss2', amount: 15000, term_id: 'term-2025-2026-2', status: 'active' },
  ],

  invoices: [
    { id: 'invoice-001', student_id: 'student-001', term_id: 'term-2025-2026-2', total_amount: 105000, paid_amount: 50000, status: 'part_paid', due_at: '2026-03-15' },
    { id: 'invoice-002', student_id: 'student-002', term_id: 'term-2025-2026-2', total_amount: 90000, paid_amount: 90000, status: 'paid', due_at: '2026-03-15' },
    { id: 'invoice-003', student_id: 'student-003', term_id: 'term-2025-2026-2', total_amount: 65000, paid_amount: 30000, status: 'part_paid', due_at: '2026-03-15' },
  ],

  invoice_items: [
    { id: 'invoice-item-001', invoice_id: 'invoice-001', fee_type_id: 'fee-tuition-ss2', label: 'School Fees', amount: 85000 },
    { id: 'invoice-item-002', invoice_id: 'invoice-001', fee_type_id: 'fee-pta-ss2', label: 'PTA Levy', amount: 5000 },
    { id: 'invoice-item-003', invoice_id: 'invoice-001', fee_type_id: 'fee-waec-ss2', label: 'WAEC Examination Levy', amount: 15000 },
  ],

  fee_payments: [
    { id: 'payment-001', invoice_id: 'invoice-001', student_id: 'student-001', amount: 50000, method: 'paystack', reference: 'PS-20260115-003', status: 'successful', paid_at: '2026-01-15T10:30:00Z' },
    { id: 'payment-002', invoice_id: 'invoice-002', student_id: 'student-002', amount: 90000, method: 'bank_transfer', reference: 'BT-20260112-008', status: 'successful', paid_at: '2026-01-12T09:15:00Z' },
    { id: 'payment-003', invoice_id: 'invoice-003', student_id: 'student-003', amount: 30000, method: 'paystack', reference: 'PS-20260120-014', status: 'successful', paid_at: '2026-01-20T14:05:00Z' },
  ],

  payroll_periods: [
    { id: 'payroll-2026-05', name: 'May 2026 Payroll', starts_at: '2026-05-01', ends_at: '2026-05-31', status: 'processing' },
  ],

  payroll_items: [
    { id: 'payroll-item-001', payroll_period_id: 'payroll-2026-05', staff_id: 'staff-001', base_pay: 620000, current_pay: 620000, adjustment: 0, paid: true },
    { id: 'payroll-item-002', payroll_period_id: 'payroll-2026-05', staff_id: 'staff-002', base_pay: 565000, current_pay: 565000, adjustment: 0, paid: false },
    { id: 'payroll-item-003', payroll_period_id: 'payroll-2026-05', staff_id: 'staff-003', base_pay: 475000, current_pay: 460000, adjustment: -15000, paid: false },
  ],

  payroll_payments: [
    { id: 'salary-payment-001', payroll_period_id: 'payroll-2026-05', staff_id: 'staff-001', amount: 620000, method: 'paystack', reference: 'PAYROLL-staff-001-20260526', status: 'successful', paid_at: '2026-05-26T09:12:00Z' },
  ],

  attendance_records: [
    { id: 'att-001', student_id: 'student-001', section_id: 'section-ss2a', subject_id: 'subject-math', date: '2026-05-26', status: 'P', period: 1 },
    { id: 'att-002', student_id: 'student-002', section_id: 'section-jss1b', subject_id: null, date: '2026-05-26', status: 'L', period: 1 },
    { id: 'att-003', student_id: 'student-003', section_id: 'section-pry4a', subject_id: null, date: '2026-05-26', status: 'P', period: 1 },
  ],

  attendance_summaries: [
    { id: 'att-summary-001', student_id: 'student-001', term_id: 'term-2025-2026-2', subject_id: 'subject-math', present: 28, absent: 2, late: 1, total: 31 },
    { id: 'att-summary-002', student_id: 'student-001', term_id: 'term-2025-2026-2', subject_id: 'subject-physics', present: 29, absent: 2, late: 0, total: 31 },
    { id: 'att-summary-003', student_id: 'student-002', term_id: 'term-2025-2026-2', subject_id: null, present: 27, absent: 3, late: 1, total: 31 },
    { id: 'att-summary-004', student_id: 'student-003', term_id: 'term-2025-2026-2', subject_id: null, present: 30, absent: 1, late: 0, total: 31 },
  ],

  weekly_attendance: [
    { id: 'weekly-att-001', student_id: 'student-001', section_id: 'section-ss2a', term_id: 'term-2025-2026-2', week: 'Week 1', week_start_date: '2026-01-12', week_end_date: '2026-01-18', status: 'present', days_present: 5, school_days: 5, teacher_notes: 'Present for the full week.' },
    { id: 'weekly-att-002', student_id: 'student-001', section_id: 'section-ss2a', term_id: 'term-2025-2026-2', week: 'Week 2', week_start_date: '2026-01-19', week_end_date: '2026-01-25', status: 'present', days_present: 5, school_days: 5, teacher_notes: 'Present for the full week.' },
    { id: 'weekly-att-003', student_id: 'student-001', section_id: 'section-ss2a', term_id: 'term-2025-2026-2', week: 'Week 3', week_start_date: '2026-01-26', week_end_date: '2026-02-01', status: 'absent', days_present: 3, school_days: 5, teacher_notes: 'Absent for two school days. Parent follow-up recommended.' },
    { id: 'weekly-att-004', student_id: 'student-002', section_id: 'section-jss1b', term_id: 'term-2025-2026-2', week: 'Week 1', week_start_date: '2026-01-12', week_end_date: '2026-01-18', status: 'present', days_present: 4, school_days: 5, teacher_notes: 'One excused absence recorded.' },
    { id: 'weekly-att-005', student_id: 'student-003', section_id: 'section-pry4a', term_id: 'term-2025-2026-2', week: 'Week 1', week_start_date: '2026-01-12', week_end_date: '2026-01-18', status: 'present', days_present: 5, school_days: 5, teacher_notes: 'Present for the full week.' },
  ],

  timetable_periods: [
    { id: 'period-001', section_id: 'section-ss2a', subject_id: 'subject-math', staff_id: 'staff-001', day: 'Monday', starts_at: '08:00', ends_at: '08:45', room: 'Block A' },
    { id: 'period-002', section_id: 'section-ss2a', subject_id: 'subject-physics', staff_id: 'staff-002', day: 'Wednesday', starts_at: '10:00', ends_at: '10:45', room: 'Physics Lab' },
  ],

  exams: [
    { id: 'exam-001', term_id: 'term-2025-2026-2', name: '2nd Term Examination', type: 'exam', status: 'draft' },
  ],

  exam_marks: [
    { id: 'mark-001', exam_id: 'exam-001', student_id: 'student-001', subject_id: 'subject-math', ca1: 18, ca2: 17, midterm: 35, exam: null, total: 70, grade: 'B2' },
    { id: 'mark-002', exam_id: 'exam-001', student_id: 'student-001', subject_id: 'subject-physics', ca1: 16, ca2: 17, midterm: 34, exam: null, total: 67, grade: 'B3' },
    { id: 'mark-003', exam_id: 'exam-001', student_id: 'student-002', subject_id: 'subject-math', ca1: 14, ca2: 15, midterm: 30, exam: null, total: 59, grade: 'C5' },
    { id: 'mark-004', exam_id: 'exam-001', student_id: 'student-003', subject_id: 'subject-english', ca1: 19, ca2: 18, midterm: 36, exam: null, total: 73, grade: 'B2' },
  ],

  report_cards: [
    {
      id: 'report-card-001',
      student_id: 'student-001',
      exam_id: 'exam-001',
      term_id: 'term-2025-2026-2',
      class_size: 38,
      position: 4,
      previous_position: 6,
      principal_remark: 'An excellent student who demonstrates diligence and commitment. Keep it up.',
      form_teacher_remark: 'Chidinma is a joy to teach. Her performance this term has been outstanding.',
      status: 'draft',
    },
    {
      id: 'report-card-002',
      student_id: 'student-002',
      exam_id: 'exam-001',
      term_id: 'term-2025-2026-2',
      class_size: 35,
      position: 9,
      previous_position: 11,
      principal_remark: 'A steady learner with improving effort.',
      form_teacher_remark: 'Emeka should keep working on revision consistency.',
      status: 'draft',
    },
  ],

  student_projects: [
    {
      id: 'project-001',
      student_id: 'student-001',
      subject_id: 'subject-physics',
      staff_id: 'staff-002',
      title: 'Solar-Powered School Garden',
      due_at: '2026-03-08',
      status: 'in_progress',
      progress: 68,
      brief: 'Build a small garden irrigation model that uses a solar cell to trigger water flow.',
    },
    {
      id: 'project-002',
      student_id: 'student-001',
      subject_id: 'subject-english',
      staff_id: 'staff-001',
      title: 'Nigerian Literature Reflection',
      due_at: '2026-03-18',
      status: 'not_started',
      progress: 12,
      brief: 'Write a short reflective essay on character growth in the assigned novel.',
    },
  ],

  inventory_items: [
    { id: 'inv-001', sku: 'BOOK-PHY-001', name: 'Advanced Physics Textbook', category: 'Books & Media', quantity: 145, reorder_level: 50, status: 'optimal' },
    { id: 'inv-002', sku: 'FURN-DESK-001', name: 'Student Desks', category: 'Furniture', quantity: 12, reorder_level: 20, status: 'low_stock' },
  ],

  admissions: [
    { id: 'app-001', student_name: 'Olayinka Sanni', class_id: 'class-jss1', guardian_name: 'Mr. Sanni', guardian_phone: '+234 806 111 2222', status: 'pending_review', applied_at: '2026-05-20' },
  ],

  messages: [
    { id: 'msg-001', sender_user_id: 'user-admin-001', recipient_user_id: 'user-parent-001', subject: 'Fee Balance Reminder', body: 'Kindly complete the current term balance before examination clearance.', read_at: null, sent_at: '2026-05-25T11:20:00Z' },
  ],

  notices: [
    { id: 'notice-001', title: 'PTA Meeting', audience: 'parents', body: 'The second term PTA meeting holds this Friday at 2:00 PM.', published_at: '2026-05-24T08:00:00Z', status: 'published' },
  ],

  parent_notifications: [
    { id: 'parent-note-001', guardian_id: 'guardian-001', student_id: null, category: 'Meeting', priority: 'high', title: 'Second term PTA meeting', message: 'Parents are invited for the second term PTA meeting in the school hall this Friday by 2:00 PM.', read_at: null, created_at: '2026-05-26T09:30:00Z' },
    { id: 'parent-note-002', guardian_id: 'guardian-001', student_id: 'student-001', category: 'Fees', priority: 'high', title: 'Fee balance reminder', message: 'A balance remains on the current term invoice. Kindly complete payment before examination clearance.', read_at: null, created_at: '2026-05-25T16:12:00Z' },
    { id: 'parent-note-003', guardian_id: 'guardian-001', student_id: 'student-003', category: 'Attendance', priority: 'normal', title: 'Attendance commendation', message: 'Blessing maintained excellent attendance last week.', read_at: '2026-05-25T08:30:00Z', created_at: '2026-05-24T08:00:00Z' },
  ],
} as const

const getStudentPortalDashboard = (studentId: string) => {
  const student = mockDatabase.students.find((item) => item.id === studentId)
  const profile = mockDatabase.student_profiles.find((item) => item.student_id === studentId)
  const section = student ? mockDatabase.sections.find((item) => item.id === student.section_id) : undefined
  const classInfo = section ? mockDatabase.classes.find((item) => item.id === section.class_id) : undefined
  const formTeacher = section ? mockDatabase.staff.find((item) => item.id === section.form_teacher_id) : undefined
  const activeTerm = mockDatabase.academic_terms.find((item) => item.status === 'active')
  const invoice = mockDatabase.invoices.find((item) => item.student_id === studentId && item.term_id === activeTerm?.id)
  const invoiceItems = invoice ? mockDatabase.invoice_items.filter((item) => item.invoice_id === invoice.id) : []
  const feePayments = mockDatabase.fee_payments.filter((item) => item.student_id === studentId)
  const marks = mockDatabase.exam_marks
    .filter((item) => item.student_id === studentId)
    .map((mark) => ({
      ...mark,
      subject: mockDatabase.subjects.find((subject) => subject.id === mark.subject_id),
      teacher: mockDatabase.subject_assignments.find((assignment) => assignment.subject_id === mark.subject_id && assignment.section_id === section?.id),
    }))
  const attendance = mockDatabase.weekly_attendance
    .filter((item) => item.student_id === studentId && item.term_id === activeTerm?.id)
  const timetable = mockDatabase.timetable_periods
    .filter((item) => item.section_id === section?.id)
    .map((period) => ({
      ...period,
      subject: mockDatabase.subjects.find((subject) => subject.id === period.subject_id),
      teacher: mockDatabase.staff.find((staff) => staff.id === period.staff_id),
    }))
  const teacherContacts = mockDatabase.teacher_contacts
    .filter((item) => item.section_id === section?.id)
    .map((contact) => ({
      ...contact,
      staff: mockDatabase.staff.find((staff) => staff.id === contact.staff_id),
      subject: mockDatabase.subjects.find((subject) => subject.id === contact.subject_id),
    }))
  const scheme = mockDatabase.scheme_weeks
    .filter((week) => week.section_id === section?.id && week.term_id === activeTerm?.id)
    .map((week) => ({
      ...week,
      topics: mockDatabase.scheme_topics
        .filter((topic) => topic.scheme_week_id === week.id)
        .map((topic) => ({
          ...topic,
          subject: mockDatabase.subjects.find((subject) => subject.id === topic.subject_id),
          teacher: mockDatabase.staff.find((staff) => staff.id === topic.staff_id),
        })),
    }))
  const projects = mockDatabase.student_projects
    .filter((item) => item.student_id === studentId)
    .map((project) => ({
      ...project,
      subject: mockDatabase.subjects.find((subject) => subject.id === project.subject_id),
      teacher: mockDatabase.staff.find((staff) => staff.id === project.staff_id),
    }))

  return {
    term: activeTerm,
    student,
    profile,
    class: classInfo,
    section,
    form_teacher: formTeacher,
    teacher_contacts: teacherContacts,
    timetable,
    subjects: marks,
    attendance,
    fees: {
      invoice,
      items: invoiceItems,
      payments: feePayments,
      balance: invoice ? invoice.total_amount - invoice.paid_amount : 0,
    },
    report_card: mockDatabase.report_cards.find((item) => item.student_id === studentId && item.term_id === activeTerm?.id),
    projects,
    scheme_of_work: scheme,
  }
}

const getParentPortalDashboard = (guardianId: string) => {
  const guardian = mockDatabase.guardians.find((item) => item.id === guardianId)
  const linkedStudents = mockDatabase.guardian_students
    .filter((item) => item.guardian_id === guardianId)
    .map((link) => ({
      ...link,
      dashboard: getStudentPortalDashboard(link.student_id),
    }))
  const invoices = linkedStudents.flatMap((item) => item.dashboard.fees.invoice ? [item.dashboard.fees.invoice] : [])
  const notifications = mockDatabase.parent_notifications
    .filter((item) => item.guardian_id === guardianId)
    .map((notification) => ({
      ...notification,
      student: notification.student_id
        ? mockDatabase.students.find((student) => student.id === notification.student_id)
        : null,
    }))

  return {
    guardian,
    children: linkedStudents,
    notifications,
    summary: {
      child_count: linkedStudents.length,
      total_fees_due: invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0),
      total_paid: invoices.reduce((sum, invoice) => sum + invoice.paid_amount, 0),
      total_balance: invoices.reduce((sum, invoice) => sum + invoice.total_amount - invoice.paid_amount, 0),
      unread_notifications: notifications.filter((item) => !item.read_at).length,
      priority_notifications: notifications.filter((item) => item.priority === 'high').length,
    },
  }
}

export const mockApiResponses = {
  '/auth/login': {
    token: 'mock-token-admin',
    user: mockDatabase.users[0],
  },

  '/dashboard/overview': {
    total_students: mockDatabase.students.length,
    total_staff: mockDatabase.staff.length,
    term_revenue: mockDatabase.fee_payments.reduce((sum, payment) => sum + payment.amount, 0),
    attendance_today: 96.8,
  },

  '/staff': {
    total: mockDatabase.staff.length,
    active: mockDatabase.staff.filter((member) => member.status === 'active').length,
    on_leave: mockDatabase.staff.filter((member) => member.status === 'on_leave').length,
    members: mockDatabase.staff,
  },

  '/students': {
    total: mockDatabase.students.length,
    data: mockDatabase.students,
  },

  '/fees/dashboard': {
    total_collected: mockDatabase.fee_payments.reduce((sum, payment) => sum + payment.amount, 0),
    pending_clearance: mockDatabase.invoices.reduce((sum, invoice) => sum + invoice.total_amount - invoice.paid_amount, 0),
    fee_types: mockDatabase.fee_types,
    recent_transactions: mockDatabase.fee_payments,
  },

  '/payroll/dashboard': {
    period: mockDatabase.payroll_periods[0],
    items: mockDatabase.payroll_items.map((item) => ({
      ...item,
      staff: mockDatabase.staff.find((member) => member.id === item.staff_id),
    })),
    payments: mockDatabase.payroll_payments,
  },

  '/portal/student/student-001': {
    student: mockDatabase.students[0],
    guardian: mockDatabase.guardians[0],
    class: mockDatabase.classes[0],
    section: mockDatabase.sections[0],
    invoices: mockDatabase.invoices,
    marks: mockDatabase.exam_marks.filter((mark) => mark.student_id === 'student-001'),
    attendance: mockDatabase.weekly_attendance.filter((record) => record.student_id === 'student-001'),
  },

  '/student/dashboard': getStudentPortalDashboard('student-001'),
  '/students/student-001/dashboard': getStudentPortalDashboard('student-001'),
  '/students/student-001/scheme-of-work': getStudentPortalDashboard('student-001').scheme_of_work,
  '/students/student-001/projects': getStudentPortalDashboard('student-001').projects,
  '/students/student-001/report-card': getStudentPortalDashboard('student-001').report_card,

  '/parent/dashboard': getParentPortalDashboard('guardian-001'),
  '/parents/guardian-001/dashboard': getParentPortalDashboard('guardian-001'),
  '/parents/guardian-001/children': getParentPortalDashboard('guardian-001').children,
  '/parents/guardian-001/notifications': getParentPortalDashboard('guardian-001').notifications,
} as const

export type MockDatabase = typeof mockDatabase
