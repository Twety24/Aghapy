import crypto from 'crypto'

const TZ = 'Africa/Cairo'
export const STEP = 30 // seconds each QR token lives in its own "slot"

export function cairoParts(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
  const o = {}
  for (const p of f.formatToParts(date)) o[p.type] = p.value
  return { year: +o.year, month: +o.month, day: +o.day, hour: +o.hour, minute: +o.minute, weekday: o.weekday }
}

// Cairo wall-clock time -> real instant (handles Egypt's daylight saving)
export function cairoToUtc(y, m, d, h) {
  const want = Date.UTC(y, m - 1, d, h)
  let t = want
  for (let i = 0; i < 2; i++) {
    const p = cairoParts(new Date(t))
    t -= Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - want
  }
  return new Date(t)
}

const pad = (n) => String(n).padStart(2, '0')
export const dateStr = (p) => `${p.year}-${pad(p.month)}-${pad(p.day)}`

// Saturday 6 PM -> 11 PM Cairo time; null if today isn't Saturday in Cairo
export function saturdayWindow(now = new Date()) {
  const p = cairoParts(now)
  if (p.weekday !== 'Sat') return null
  return { meetingDate: dateStr(p), starts: cairoToUtc(p.year, p.month, p.day, 18), ends: cairoToUtc(p.year, p.month, p.day, 23) }
}

const sign = (secret, id, slot) => crypto.createHmac('sha256', secret).update(`${id}.${slot}`).digest('hex').slice(0, 24)
const nowSlot = () => Math.floor(Date.now() / 1000 / STEP)

export function makeToken(session) {
  const slot = nowSlot()
  return `${session.id}.${slot}.${sign(session.qr_secret, session.id, slot)}`
}
export function parseToken(t) {
  const [id, slot, sig] = String(t || '').split('.')
  return id && slot && sig && /^\d+$/.test(slot) ? { id, slot: +slot, sig } : null
}
// accepts the current slot and ~60-90s back, so a slow scan still works but a forwarded photo doesn't
export function verifyToken(session, { id, slot, sig }) {
  if (id !== session.id || slot < nowSlot() - 2 || slot > nowSlot() + 1) return false
  const a = Buffer.from(sig), b = Buffer.from(sign(session.qr_secret, id, slot))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
