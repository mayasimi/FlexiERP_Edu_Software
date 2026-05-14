'use client'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { ExternalLink, GraduationCap, Users, BookOpen, CreditCard } from 'lucide-react'

export default function PortalPage() {
  return (
    <AppLayout>
      <Topbar />
      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Student & Parent Portal</h1>
        <p className="page-subtitle">Access and manage portal settings, permissions, and external links.</p>
      </div>
      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: GraduationCap, label: 'Student Portal', desc: 'Results, timetable, attendance', href: '#' },
            { icon: Users, label: 'Parent Portal', desc: 'Fee status, child progress', href: '#' },
            { icon: BookOpen, label: 'E-Learning', desc: 'Online classes & materials', href: '#' },
            { icon: CreditCard, label: 'Payment Gateway', desc: 'Online fee payment', href: '#' },
          ].map(({ icon: Icon, label, desc, href }) => (
            <a key={label} href={href} className="card-hover flex flex-col items-center text-center py-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: 'rgba(201,160,32,0.1)', border: '1px solid rgba(201,160,32,0.2)' }}>
                <Icon size={24} style={{ color: '#C9A020' }} />
              </div>
              <h3 className="font-bold mb-1">{label}</h3>
              <p className="text-sm" style={{ color: '#6B6660' }}>{desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: '#C9A020' }}>
                <ExternalLink size={11} /> Open Portal
              </div>
            </a>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
