import { NextResponse } from 'next/server'

// This app has NO Vercel Deployment Protection and holds no restaurant
// credentials of its own — it's a thin public proxy in front of the real
// (protected) dashboard's /api/staff-hours route. Two independent gates
// still apply: the Vercel Automation Bypass secret gets this server-to-server
// request past the upstream project's Deployment Protection, and the shared
// STAFF_HOURS_PUBLIC_SLUG gets it past that route's own app-level check.
const UPSTREAM = 'https://yoi-dashboard.vercel.app/api/staff-hours'

function checkSlug(searchParams) {
  const slug = searchParams.get('slug') || ''
  const expected = process.env.STAFF_HOURS_PUBLIC_SLUG?.trim()
  return !!expected && slug === expected ? expected : null
}

function bypassHeader() {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  return bypass ? { 'x-vercel-protection-bypass': bypass } : null
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const expected = checkSlug(searchParams)
  if (!expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const bypass = bypassHeader()
  if (!bypass) {
    return NextResponse.json({ error: 'Server missing VERCEL_AUTOMATION_BYPASS_SECRET' }, { status: 500 })
  }

  const param = searchParams.get('param') || ''
  const view = searchParams.get('view') || ''
  const upstreamUrl = `${UPSTREAM}?param=${encodeURIComponent(param)}&view=${encodeURIComponent(view)}&slug=${encodeURIComponent(expected)}`

  const res = await fetch(upstreamUrl, { headers: bypass, cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req) {
  const { searchParams } = new URL(req.url)
  const expected = checkSlug(searchParams)
  if (!expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const bypass = bypassHeader()
  if (!bypass) {
    return NextResponse.json({ error: 'Server missing VERCEL_AUTOMATION_BYPASS_SECRET' }, { status: 500 })
  }

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const upstreamUrl = `${UPSTREAM}?slug=${encodeURIComponent(expected)}`
  const res = await fetch(upstreamUrl, {
    method: 'POST',
    headers: { ...bypass, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } })
}
