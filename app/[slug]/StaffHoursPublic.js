'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'

function hm(h) {
  const hrs = Math.floor(h)
  const min = Math.round((h - hrs) * 60)
  return min > 0 ? `${hrs}h ${min}m` : `${hrs}h`
}
function money(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function addDays(s, n) {
  const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function fmtDate(s) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function weekSunday(s) {
  const d = new Date(s + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().split('T')[0]
}
function centralToday() {
  return new Date(Date.now() - 4 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}
function weekOptions() {
  const options = []
  let cur = weekSunday('2026-06-01')
  const last = weekSunday(centralToday())
  while (cur <= last) {
    const end = addDays(cur, 6)
    options.push({ value: cur, label: `${fmtDate(cur)} – ${fmtDate(end)}` })
    cur = addDays(cur, 7)
  }
  return options.reverse()
}
// Real pay cycle is semi-monthly (1st–15th, 16th–end of month), not calendar weeks.
function semiMonthStartFor(dateStr) {
  const monthPrefix = dateStr.slice(0, 7)
  const day = Number(dateStr.slice(8, 10))
  return day <= 15 ? `${monthPrefix}-01` : `${monthPrefix}-16`
}
function semiMonthOptions() {
  const options = []
  let y = 2026, m = 6
  const todayStr = centralToday()
  while (`${y}-${String(m).padStart(2, '0')}` <= todayStr.slice(0, 7)) {
    const monthPrefix = `${y}-${String(m).padStart(2, '0')}`
    const lastDay = new Date(y, m, 0).getDate()
    const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
    options.push({ value: `${monthPrefix}-01`, label: `${monthLabel} 1–15` })
    options.push({ value: `${monthPrefix}-16`, label: `${monthLabel} 16–${lastDay}` })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return options.filter((o) => o.value <= todayStr).reverse()
}

const card = { background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
const label = { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }
const bigNum = { fontSize: 20, fontWeight: 700, color: '#111827' }
const th = { textAlign: 'left', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #f3f4f6' }
const td = { padding: '10px 16px', borderBottom: '1px solid #f9fafb' }

export default function StaffHoursPublic({ slug }) {
  const [periodType, setPeriodType] = useState('weekly') // 'weekly' | 'semimonthly'
  const [weekStart, setWeekStart] = useState(() => weekSunday(centralToday()))
  const [semiMonthStart, setSemiMonthStart] = useState(() => semiMonthStartFor(centralToday()))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [paidDrafts, setPaidDrafts] = useState({})
  const [savingEmployee, setSavingEmployee] = useState(null)

  const periodParam = periodType === 'weekly' ? weekStart : semiMonthStart

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/staff-hours?param=${periodParam}&view=${periodType}&slug=${encodeURIComponent(slug)}`)
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setData(d)
      setPaidDrafts({})
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [periodParam, periodType, slug])

  useEffect(() => { fetchData() }, [fetchData])

  const savePaid = async (employee, amount) => {
    if (!data) return
    setSavingEmployee(employee)
    try {
      const r = await fetch(`/api/staff-hours?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee, periodStart: data.startDate, periodEnd: data.endDate, paidAmount: amount }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      await fetchData()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingEmployee(null)
    }
  }

  const today = centralToday()
  const todayWeekMon = weekSunday(today)
  const todaySemiStart = semiMonthStartFor(today)
  const weekOpts = weekOptions()
  const semiOpts = semiMonthOptions()

  const atLatestPeriod = periodType === 'weekly' ? weekStart >= todayWeekMon : semiMonthStart >= todaySemiStart

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          {[['weekly', 'Weekly'], ['semimonthly', 'Semi-Monthly']].map(([value, text]) => (
            <button
              key={value}
              onClick={() => setPeriodType(value)}
              style={{
                padding: '6px 14px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: periodType === value ? '#0d9488' : '#fff',
                color: periodType === value ? '#fff' : '#374151',
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => periodType === 'weekly' ? setWeekStart(addDays(weekStart, -7)) : setSemiMonthStart((cur) => {
              const [y, m] = cur.split('-').map(Number)
              return cur.endsWith('-16') ? `${cur.slice(0, 7)}-01` : `${String(m === 1 ? y - 1 : y)}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}-16`
            })}
            aria-label="Previous period"
            style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 700, cursor: 'pointer' }}>‹</button>
          <select
            value={periodParam}
            onChange={(e) => periodType === 'weekly' ? setWeekStart(e.target.value) : setSemiMonthStart(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#374151', background: '#fff' }}
          >
            {(periodType === 'weekly' ? weekOpts : semiOpts).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => periodType === 'weekly' ? setWeekStart(addDays(weekStart, 7)) : setSemiMonthStart((cur) => {
              const [y, m] = cur.split('-').map(Number)
              return cur.endsWith('-01') ? `${cur.slice(0, 7)}-16` : `${String(m === 12 ? y + 1 : y)}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`
            })}
            disabled={atLatestPeriod} aria-label="Next period"
            style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 700, cursor: atLatestPeriod ? 'default' : 'pointer', opacity: atLatestPeriod ? 0.3 : 1 }}>›</button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {loading && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0' }}>Loading…</p>}

      {!loading && data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ ...card, borderLeft: '4px solid #0d9488' }}>
              <div style={label}>Total Hours</div>
              <div style={bigNum}>{hm(data.totalHours)}</div>
            </div>
            <div style={{ ...card, borderLeft: '4px solid #d97706' }}>
              <div style={label}>Total Amount</div>
              <div style={bigNum}>{money(data.totalPay)}</div>
            </div>
            <div style={{ ...card, borderLeft: '4px solid #16a34a' }}>
              <div style={label}>Paid</div>
              <div style={bigNum}>{money(data.totalPaid ?? 0)}</div>
            </div>
            <div style={{ ...card, borderLeft: '4px solid #dc2626' }}>
              <div style={label}>Balance</div>
              <div style={bigNum}>{money(data.totalBalance ?? 0)}</div>
            </div>
          </div>

          {data.employees.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0', fontSize: 14 }}>No shift data for this period.</p>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={th}>Employee</th>
                    <th style={{ ...th, textAlign: 'center' }}>Shifts</th>
                    <th style={{ ...th, textAlign: 'right' }}>Total Hours</th>
                    <th style={{ ...th, textAlign: 'right' }}>Pay</th>
                    <th style={{ ...th, textAlign: 'right' }}>Paid</th>
                    <th style={{ ...th, textAlign: 'right' }}>Balance</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((emp) => {
                    const draft = paidDrafts[emp.employee]
                    const paidValue = draft !== undefined ? draft : String(emp.paid ?? 0)
                    return (
                      <Fragment key={emp.employee}>
                        <tr>
                          <td style={{ ...td, fontWeight: 600, color: '#1f2937', cursor: 'pointer' }}
                            onClick={() => setExpanded(expanded === emp.employee ? null : emp.employee)}>
                            {emp.employee}
                          </td>
                          <td style={{ ...td, textAlign: 'center', color: '#6b7280' }}>{emp.shifts.length}</td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>{hm(emp.totalHours)}</td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{money(emp.pay)}</td>
                          <td style={{ ...td, textAlign: 'right' }}>
                            <input
                              type="number" step="0.01" min="0"
                              value={paidValue}
                              disabled={savingEmployee === emp.employee}
                              onChange={(e) => setPaidDrafts((cur) => ({ ...cur, [emp.employee]: e.target.value }))}
                              onBlur={(e) => {
                                const n = Number(e.target.value)
                                if (Number.isFinite(n) && n >= 0 && n !== emp.paid) savePaid(emp.employee, n)
                              }}
                              style={{ width: 90, textAlign: 'right', padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#15803d' }}
                            />
                          </td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: emp.balance > 0.01 ? '#dc2626' : '#6b7280' }}>{money(emp.balance)}</td>
                          <td style={{ ...td, textAlign: 'right', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={() => setExpanded(expanded === emp.employee ? null : emp.employee)}>
                            {expanded === emp.employee ? '▲ Hide' : '▼ Details'}
                          </td>
                        </tr>
                        {expanded === emp.employee && (
                          <tr style={{ background: '#f9fafb' }}>
                            <td colSpan={7} style={{ padding: '8px 16px' }}>
                              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: '#9ca3af' }}>
                                    <th style={{ textAlign: 'left', padding: '4px 16px 4px 0' }}>Date</th>
                                    <th style={{ textAlign: 'left', padding: '4px 16px 4px 0' }}>Clock In</th>
                                    <th style={{ textAlign: 'left', padding: '4px 16px 4px 0' }}>Clock Out</th>
                                    <th style={{ textAlign: 'right', padding: '4px 0' }}>Hours</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emp.shifts.map((s, i) => (
                                    <tr key={i}>
                                      <td style={{ padding: '4px 16px 4px 0', color: '#374151' }}>{s.date}</td>
                                      <td style={{ padding: '4px 16px 4px 0', color: '#6b7280' }}>{s.start}</td>
                                      <td style={{ padding: '4px 16px 4px 0', color: '#6b7280' }}>{s.end}</td>
                                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#374151' }}>{s.hours}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
