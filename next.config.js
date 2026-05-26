/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
const apiOrigin = (() => {
  try {
    return new URL(apiUrl).origin
  } catch {
    return 'http://localhost:8000'
  }
})()

const nextConfig = {
  images: {
    remotePatterns: [],
  },
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.paystack.com")' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.paystack.co https://checkout.paystack.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com",
              "img-src 'self' data: blob:",
              "font-src 'self' data: https://fonts.cdnfonts.com",
              `connect-src 'self' ${apiOrigin} https://api.paystack.co https://checkout.paystack.com`,
              "frame-src https://checkout.paystack.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
