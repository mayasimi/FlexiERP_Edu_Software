import AppLayout from '@/components/layout/AppLayout'
import { ParentNotifications } from '@/components/portal/PortalViews'

interface NotificationsPageProps {
  searchParams?: {
    notification?: string
  }
}

export default function NotificationsPage({ searchParams }: NotificationsPageProps) {
  return (
    <AppLayout>
      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">School updates, reminders, and action items.</p>
      </div>
      <div className="px-6 pb-8 animate-in stagger-1">
        <ParentNotifications selectedNotificationId={searchParams?.notification} />
      </div>
    </AppLayout>
  )
}
