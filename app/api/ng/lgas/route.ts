import { NextResponse } from 'next/server'

const SOURCE_URL =
  'https://gist.github.com/devhammed/0bb9eeac9ff22c895100d072f489dc98/raw/a7b19911407a89947c452339fee59f9335dc8225/nigeria-state-and-lgas.json'

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to load LGA list' }, { status: 502 })
    }
    const data = (await res.json()) as unknown
    return NextResponse.json(data, {
      headers: {
        'cache-control': 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load LGA list' }, { status: 502 })
  }
}

