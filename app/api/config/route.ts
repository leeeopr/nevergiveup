import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // Filter out typical placeholders to avoid noise
  const isPlaceholder = (val: string) => {
    const v = val.toLowerCase()
    return (
      v.includes('placeholder') ||
      v.includes('your-project') ||
      v.includes('your-anon-key') ||
      v === ''
    )
  }

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: isPlaceholder(url) ? null : url.trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: isPlaceholder(key) ? null : key.trim(),
  })
}
