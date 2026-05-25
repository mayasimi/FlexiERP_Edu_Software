import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
<<<<<<< HEAD

export const metadata: Metadata = {
  title: 'EduManage – School Administration System',
  description: 'Comprehensive school management platform powered by EduManage',
=======
import { AuthProvider } from '@/context/AuthContext'

export const metadata: Metadata = {
  title: 'FlexiSoftware – School Administration System',
  description: 'Comprehensive school management platform powered by GWPL',
>>>>>>> 57b1739e (Full Code Base of EduSoftware)
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
<<<<<<< HEAD
        <Providers>{children}</Providers>
=======
        <Providers>
            <AuthProvider>{children}</AuthProvider>
        </Providers>
>>>>>>> 57b1739e (Full Code Base of EduSoftware)
      </body>
    </html>
  )
}
