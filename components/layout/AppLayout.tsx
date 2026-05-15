import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F7F6F3' }}>
      <Sidebar />
      <div className="main-content flex-1">
        <Navbar />
        {children}
      </div>
    </div>
  )
}
