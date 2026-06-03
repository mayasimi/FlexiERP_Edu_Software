/**
 * EduManage API Client
 * Connects Next.js frontend to PHP Laravel backend
 * Base URL: NEXT_PUBLIC_API_URL (default: http://localhost:8000/api)
 */

import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// ─── Axios Instance ─────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json', 
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true', 
  },
  withCredentials: true,
})

// ─── Request Interceptor: attach Bearer token ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('flexi_token')  // ← was sessionStorage 'edu_token'
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response Interceptor: handle 401 globally ──────────────────────────────
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('flexi_token')   // ← was sessionStorage 'edu_token'
      localStorage.removeItem('flexi_user')
      localStorage.removeItem('edu_user_role')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ─────────────────────────────────────────────────────────────────────────────
// AUTH  →  Laravel: routes/api.php  POST /api/auth/*
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; email: string; password: string }) =>
    api.post('/auth/reset-password', data),
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD  →  Laravel: App\Http\Controllers\DashboardController
// ─────────────────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getOverview: () => api.get('/dashboard/overview'),
  getRecentActivities: (limit = 10) => api.get(`/dashboard/activities?limit=${limit}`),
  getQuickStats: () => api.get('/dashboard/stats'),
}

//PAYROLL
export const payrollApi = {
  getMyPayslips: () => api.get('/payroll/my-payslips'),
}

// STAFF
export const staffApi = {
  list: (params: { page?: number; search?: string; department?: string; role?: string; status?: string; per_page?: number }) =>
    api.get('/staff', { params }),
  show: (id: number) => api.get(`/staff/${id}`),
}

// ACADEMICS
export const academicsApi = {
  getClasses: () => api.get('/academics/classes'),
  // section_id is the numeric ID returned from getClasses
  getSubjects: (classId: string, sectionId: string) =>
    api.get('/academics/subjects', { params: { class_id: classId, section_id: sectionId } }),
}

// ADMISSIONS
export const admissionApi = {
  list: (params: {
    status?: string; date_from?: string; date_to?: string;
    program?: string; page?: number; per_page?: number;
  }) => api.get('/admissions', { params }),
  create: (data: { first_name: string; last_name: string; program: string; date_applied: string; email?: string; phone?: string }) =>
    api.post('/admissions', data),
}

// ATTENDANCE
export const attendanceApi = {
  getStudents: (params: { class_id: string; section_id: string; subject_id?: string; date: string }) =>
    api.get('/attendance/students', { params }),
  saveAttendance: (data: {
    section_id: string; date: string;
    attendance: { student_id: string; status: string }[];
  }) => api.post('/attendance/save', data),
}

// FEES
export const feeApi = {
  getDashboard: () => api.get('/fees/dashboard'),
}

// INVENTORY
export const inventoryApi = {
  list: (params?: { category?: string; status?: string }) =>
    api.get('/inventory', { params }),
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE  →  Laravel: App\Http\Controllers\TimetableController
// ─────────────────────────────────────────────────────────────────────────────
export const timetableApi = {
  get: (params: { class_id: string; section_id: string }) =>
    api.get('/timetable', { params }),
  generate: (params: { class_id: string; section_id: string; term_id: string }) =>
    api.post('/timetable/generate', params),
  update: (id: string, data: Record<string, unknown>) => api.put(`/timetable/${id}`, data),
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS  →  Laravel: App\Http\Controllers\StudentController
// ─────────────────────────────────────────────────────────────────────────────
export const studentApi = {

  list: (params: {
      page?: number
      search?: string
      grade?: string
      status?: string
      per_page?: number
    }) => api.get('/students', { params }),

    show: (studentId: string) =>
      api.get(`/students/${studentId}`),

  create: (data: FormData) =>
    api.post('/students', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: FormData) =>
    api.post(`/students/${id}?_method=PUT`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/students/${id}`),
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS / EXAMINATIONS  →  Laravel: App\Http\Controllers\ExaminationController
// ─────────────────────────────────────────────────────────────────────────────
export const examApi = {
  getExams: (params?: Record<string, unknown>) => api.get('/exams', { params }),
  loadStudentsForMarks: (params: {
    exam_type: string; class_id: string; section_id: string
  }) => api.get('/exams/marks/load', { params }),
  saveMarks: (data: Record<string, unknown>) => api.post('/exams/marks/save', data),
  publishResults: (examId: string) => api.patch(`/exams/${examId}/publish`),
  generateReportCard: (studentId: string, examId: string) =>
    api.get(`/exams/report-card`, { params: { student_id: studentId, exam_id: examId } }),
  getGradingScale: () => api.get('/exams/grading-scale'),
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGING  →  Laravel: App\Http\Controllers\MessagingController
// ─────────────────────────────────────────────────────────────────────────────
export const messagingApi = {
  getInbox: (params?: Record<string, unknown>) => api.get('/messages/inbox', { params }),
  getSent: (params?: Record<string, unknown>) => api.get('/messages/sent', { params }),
  getDrafts: () => api.get('/messages/drafts'),
  show: (id: string) => api.get(`/messages/${id}`),
  send: (data: Record<string, unknown>) => api.post('/messages/send', data),
  sendBulk: (data: Record<string, unknown>) => api.post('/messages/bulk', data),
  delete: (id: string) => api.delete(`/messages/${id}`),
  markRead: (id: string) => api.patch(`/messages/${id}/read`),
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS  →  Laravel: App\Http\Controllers\ReportController
// ─────────────────────────────────────────────────────────────────────────────
export const reportApi = {
  getAnalytics: () => api.get('/reports/analytics'),
  getEnrollmentTrends: (params?: Record<string, unknown>) => api.get('/reports/enrollment', { params }),
  getFeeCollection: (params?: Record<string, unknown>) => api.get('/reports/fee-collection', { params }),
  getTopPerformers: (params?: Record<string, unknown>) => api.get('/reports/top-performers', { params }),
  getAttendanceReport: (params?: Record<string, unknown>) => api.get('/reports/attendance', { params }),
  generate: (data: Record<string, unknown>) =>
    api.post('/reports/generate', data, { responseType: 'blob' }),
  exportData: (params?: Record<string, unknown>) =>
    api.get('/reports/export', { params, responseType: 'blob' }),
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS  →  Laravel: App\Http\Controllers\SettingsController
// ─────────────────────────────────────────────────────────────────────────────
export const settingsApi = {
  getClasses: () => api.get('/settings/classes'),
  addClass: (data: Record<string, unknown>) => api.post('/settings/classes', data),
  updateClass: (id: string, data: Record<string, unknown>) => api.put(`/settings/classes/${id}`, data),
  getTerms: () => api.get('/settings/terms'),
  addTerm: (data: Record<string, unknown>) => api.post('/settings/terms', data),
  updateTerm: (id: string, data: Record<string, unknown>) => api.put(`/settings/terms/${id}`, data),
  getNotices: () => api.get('/settings/notices'),
  postNotice: (data: Record<string, unknown>) => api.post('/settings/notices', data),
  deleteNotice: (id: string) => api.delete(`/settings/notices/${id}`),
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT CARDS  →  Laravel: App\\Http\\Controllers\\ReportCardController
// ─────────────────────────────────────────────────────────────────────────────
export const reportCardApi = {
  // GET /api/report-card?exam_type=...&class=...&section=...&student_id=...
  getReportCard: (params: Record<string, unknown>) => api.get('/report-card', { params }),
  // POST /api/report-card/generate  → returns PDF blob
  generatePdf: (data: Record<string, unknown>) =>
    api.post('/report-card/generate', data, { responseType: 'blob' }),
  // POST /api/report-card/bulk-generate  → returns ZIP of PDFs
  bulkGenerate: (data: Record<string, unknown>) =>
    api.post('/report-card/bulk-generate', data, { responseType: 'blob' }),
}

// ── TEACHER API ───────────────────────────────────────────────────────────────

export const teacherApi = {
  // DashboardSection: stats + today schedule + pending attendance + assessments
  getDashboard: () => api.get('/teacher/dashboard'),

  // ScheduleSection: full weekly timetable
  getSchedule: (day?: string) => api.get('/teacher/schedule', { params: { day } }),

  // GroupsSection: teacher's class sections
  getGroups: () => api.get('/teacher/groups'),
  getGroupStudents: (sectionId: string) => api.get(`/teacher/groups/${sectionId}/students`),

  // AssessmentSection: assessments list + grading
  getAssessments: (sectionId?: string) =>
    api.get('/teacher/assessments', { params: { section_id: sectionId } }),
  getAssessmentGrades: (assessmentId: string) =>
    api.get(`/teacher/assessments/${assessmentId}/grades`),
  saveGrades: (assessmentId: string, grades: { student_id: string; marks: number | null; remarks: string }[]) =>
    api.post(`/teacher/assessments/${assessmentId}/grades`, { grades }),

  // PerformanceSection: analytics
  getPerformance: (sectionId?: string) =>
    api.get('/teacher/performance', { params: { section_id: sectionId } }),

  // LessonPlanSection
  getLessonPlans: () => api.get('/teacher/lesson-plans'),

  // MessagesSection
  getMessages: () => api.get('/teacher/messages'),
  sendMessage: (conversationId: string, body: string, subject?: string) =>
    api.post('/teacher/messages', { conversation_id: conversationId, body, subject }),
}

// ── STUDENT / PARENT PORTAL API ───────────────────────────────────────────────

export const portalApi = {
  // PortalViews Dashboard component
  getDashboard: () => api.get('/portal/dashboard'),

  // SubjectsView: subjects with CA scores
  getSubjects: () => api.get('/portal/subjects'),

  // AttendanceView: attendance summary per subject
  getAttendance: () => api.get('/portal/attendance'),

  // FeesView: fee breakdown + payment history
  getFees: () => api.get('/portal/fees'),
}
