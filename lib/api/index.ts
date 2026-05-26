/**
 * Central export for all API modules.
 */

import { apiClient } from './client';

/*
|--------------------------------------------------------------------------
| Types – match exactly what DashboardController returns
|--------------------------------------------------------------------------
*/

export type DashboardStats = {
  total_students: number;
  total_students_change: string;
  total_staff: number;
  staff_change: string;
  term_revenue: number;
  revenue_change: string;
  revenue_collected_pct: number;
  attendance_today: number;
  attendance_change: string;
  absent_count: number;
  late_count: number;
};

export type ActivityItem = {
  id: number;
  type: 'payment' | 'admission' | 'meeting' | 'system' | 'attendance' | 'general';
  title: string;
  desc: string;
  time: string;
};

/*
|--------------------------------------------------------------------------
| Helper: get the stored token
|--------------------------------------------------------------------------
*/

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('edu_token') ?? sessionStorage.getItem('flexi_token') ?? '';
}

/*
|--------------------------------------------------------------------------
| Dashboard API
|----------------------------------------------------------
*/

export const dashboardApi = {
  getOverview: async (): Promise<{ data: DashboardStats }> => {
    const data = await apiClient.get<DashboardStats>('/dashboard/overview', getToken());
    return { data };
  },

  getRecentActivities: async (limit = 10): Promise<{ data: ActivityItem[] }> => {
    const data = await apiClient.get<ActivityItem[]>(
      `/dashboard/activities?limit=${limit}`,
      getToken(),
    );
    return { data };
  },
};

/*
|--------------------------------------------------------------------------
| Re-export auth API so everything is importable from '@/lib/api'
|--------------------------------------------------------------------------
*/

export { authApi } from './auth';
export { apiClient } from './client';
