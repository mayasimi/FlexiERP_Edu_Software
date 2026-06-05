-- Backend handoff migration: weekly attendance replacing subject attendance.

CREATE TABLE weekly_attendance (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  class_id CHAR(36) NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status ENUM('present', 'absent') NOT NULL,
  teacher_notes TEXT NULL,
  marked_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY weekly_attendance_student_week_unique (student_id, class_id, week_start_date),
  INDEX weekly_attendance_class_week_idx (class_id, week_start_date),
  INDEX weekly_attendance_student_idx (student_id)
);
