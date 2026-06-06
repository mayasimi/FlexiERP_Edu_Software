'use client'
// ParentSwitch — shows real children from DB, allows switching between them

import { Avatar, Card, CardLabel, GoldBadge, StatCard } from './portalUi'

const GOLD  = '#C9A020'
const RED   = '#EF4444'
const GREEN = '#10B981'
const BLUE  = '#3B82F6'

const levelColor: Record<string, string> = {
  'Senior Secondary': GOLD,
  'Junior Secondary': BLUE,
  'Primary School':   GREEN,
}

interface Child {
  student_id:   string
  name:         string
  first_name:   string
  avatar:       string
  class:        string
  section:      string
  class_section: string
  level:        string
  admission_no: string
  status:       string
}

interface Props {
  children:     Child[]
  activeChildId: string
  onSelect:     (studentId: string) => void
}

export function ParentSwitch({ children, activeChildId, onSelect }: Props) {
  const activeChild = children.find(c => c.student_id === activeChildId) ?? children[0]

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>My Children</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>Select a child to view their portal.</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <p style={{ color: '#9B9590', fontSize: 13 }}>No children found linked to this parent account. Contact the school admin to link your children.</p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
            {children.map(child => (
              <div
                key={child.student_id}
                onClick={() => onSelect(child.student_id)}
                style={{
                  background: '#FFFFFF',
                  border: `2px solid ${activeChildId === child.student_id ? GOLD : '#E8E4DC'}`,
                  borderRadius: 14,
                  padding: '22px 18px',
                  cursor: 'pointer',
                  boxShadow: activeChildId === child.student_id ? `0 4px 20px ${GOLD}22` : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s',
                }}
              >
                <Avatar initials={child.avatar} size={48} />
                <p style={{ margin: '12px 0 3px', fontSize: 16, color: '#0D0D0D', fontFamily: "'Georgia',serif" }}>{child.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9B9590', fontFamily: 'monospace' }}>{child.admission_no}</p>
                <div style={{ marginTop: 6 }}>
                  <GoldBadge color={levelColor[child.level] ?? GOLD}>{child.class_section}</GoldBadge>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#5C5750' }}>{child.level}</p>
                {activeChildId === child.student_id && (
                  <div style={{ marginTop: 12, padding: '6px 12px', background: `${GOLD}14`, borderRadius: 6, border: `1px solid ${GOLD}44` }}>
                    <p style={{ margin: 0, fontSize: 11, color: GOLD, fontWeight: 700 }}>✓ CURRENTLY VIEWING</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeChild && (
            <Card>
              <CardLabel>Quick Summary — {activeChild.name}</CardLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                <StatCard label="Class"       value={activeChild.class_section} sub={activeChild.level}    color={GOLD}  />
                <StatCard label="Student ID"  value={activeChild.student_id}   sub="Admission number"     color={BLUE}  />
                <StatCard label="Status"      value={activeChild.status === 'active' ? 'Active' : activeChild.status} sub="Enrollment" color={GREEN} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
