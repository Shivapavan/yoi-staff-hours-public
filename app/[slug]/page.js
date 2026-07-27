import { notFound } from 'next/navigation'
import StaffHoursPublic from './StaffHoursPublic'

export const dynamic = 'force-dynamic'

export default async function Page({ params }) {
  const { slug } = await params
  const expected = process.env.STAFF_HOURS_PUBLIC_SLUG?.trim()
  if (!expected || slug !== expected) notFound()

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 18 }}>Yum of India · Staff Hours</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Weekly hours &amp; pay by employee</div>
        </div>
      </header>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <StaffHoursPublic slug={slug} />
      </main>
    </div>
  )
}
