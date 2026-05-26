import { Suspense } from 'react'
import PortalPage from '@/components/portal/PortalPage'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PortalPage />
    </Suspense>
  )
}
