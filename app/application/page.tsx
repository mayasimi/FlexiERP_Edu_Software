'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function ApplicationPage() {
  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.70), rgba(0,0,0,0.70)), url('/school-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative z-10 w-full max-w-3xl text-center">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/WHITE FLEXI LOGO.png"
            alt="FlexiERP Logo"
            width={220}
            height={80}
            priority
            className="object-contain"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Welcome to EduERP</h1>
        <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
          Apply in minutes. Complete the admission form and submit your application.
        </p>

        <div className="mt-8 flex items-center justify-center">
          <Link href="/application/form">
            <button className="w-full max-w-xs px-7 py-3 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors font-semibold text-lg">
              Apply Now
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}