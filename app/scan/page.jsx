'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import jsQR from 'jsqr'

export default function ScanPage() {
  const video = useRef(null)
  const stream = useRef(null)
  const busy = useRef(false)
  const raf = useRef(0)
  const [state, setState] = useState('starting') // starting | scanning | done | denied
  const [result, setResult] = useState(null)

  function stop() {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }

  async function submit(token) {
    busy.current = true; stop()
    const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const j = await res.json().catch(() => ({ code: 'error', message: 'حصلت مشكلة. جرّب تاني.' }))
    setResult(j); setState('done')
  }

  async function start() {
    busy.current = false; setResult(null); setState('starting')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      stream.current = s
      const v = video.current
      v.srcObject = s; v.setAttribute('playsinline', 'true'); await v.play()
      setState('scanning')
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const tick = () => {
        if (busy.current || !stream.current) return
        if (v.videoWidth) {
          const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w)
          canvas.width = w; canvas.height = h; ctx.drawImage(v, 0, 0, w, h)
          const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
          if (code?.data) return submit(code.data)
        }
        raf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { setState('denied') }
  }

  useEffect(() => { start(); return stop }, [])

  const ok = result && (result.code === 'ok' || result.code === 'already')

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-navy px-5 py-6 text-white">
      <Link href="/dashboard" className="text-sm text-sky underline">رجوع</Link>
      <h1 className="mt-4 text-2xl font-bold">تسجيل الحضور</h1>

      {state !== 'done' && state !== 'denied' && (
        <>
          <p className="mt-1 text-sky">وجّه الكاميرا ناحية الكود اللي المسؤول بيعرضه.</p>
          <div className="mt-6 overflow-hidden rounded-3xl ring-4 ring-sky/40">
            <video ref={video} muted playsInline className="aspect-square w-full bg-black object-cover" />
          </div>
          {state === 'starting' && <p className="mt-4 text-center text-sky">جاري فتح الكاميرا...</p>}
        </>
      )}

      {state === 'denied' && (
        <div className="mt-6 space-y-4 rounded-2xl bg-white p-5 text-navy">
          <p>محتاجين إذن الكاميرا عشان نمسح الكود. فعّله من إعدادات المتصفح للموقع ده، وبعدين جرّب تاني.</p>
          <button className="btn btn-red" onClick={start}>جرّب تاني</button>
        </div>
      )}

      {state === 'done' && result && (
        <div className="mt-6 space-y-4 rounded-2xl bg-white p-6 text-center text-navy" role="status">
          <p className={`text-5xl ${ok ? 'text-green-600' : 'text-stage'}`} aria-hidden="true">{ok ? '✓' : '✕'}</p>
          <p className="text-lg font-bold">{result.message}</p>
          {ok ? <Link href="/dashboard" className="btn btn-navy">تمام</Link> : <button className="btn btn-red" onClick={start}>امسح تاني</button>}
        </div>
      )}
    </main>
  )
}
