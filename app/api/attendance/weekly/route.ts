import { NextRequest, NextResponse } from 'next/server'
import { getWeeklyAttendance, upsertWeeklyAttendance, type WeeklyAttendanceStatus } from '@/lib/server/feature-store'

export async function GET(request: NextRequest) {
  const classId = request.nextUrl.searchParams.get('class')
  const weekStart = request.nextUrl.searchParams.get('weekStart')

  if (!classId || !weekStart) {
    return NextResponse.json({ message: 'class and weekStart query parameters are required.' }, { status: 422 })
  }

  return NextResponse.json({ data: getWeeklyAttendance(classId, weekStart) })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  try {
    const records = upsertWeeklyAttendance({
      class_id: typeof body.class_id === 'string' ? body.class_id : '',
      week_start_date: typeof body.week_start_date === 'string' ? body.week_start_date : '',
      week_end_date: typeof body.week_end_date === 'string' ? body.week_end_date : '',
      records: Array.isArray(body.records)
        ? body.records.map((record: Record<string, unknown>) => ({
            student_id: String(record.student_id || ''),
            status: (record.status === 'absent' ? 'absent' : 'present') as WeeklyAttendanceStatus,
            teacher_notes: typeof record.teacher_notes === 'string' ? record.teacher_notes : '',
          }))
        : [],
    })

    return NextResponse.json({ data: records }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save weekly attendance.' }, { status: 422 })
  }
}
