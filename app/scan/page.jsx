'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import jsQR from 'jsqr'
import { useT } from '@/components/LangProvider'

export default function ScanPage() {
  const { lang } = useT()
  const en = lang === 'en'
  const c = en
    ? {
        title: 'Attendance check-in',
        hint: 'Point your camera at the QR code displayed by the session administrator.',
        camera: 'Camera access is required to scan the code. Enable camera permissions for this website in your browser settings, then try again.',
        retry: 'Try again',
        opening: 'Opening camera...',
        success: 'Done',
        scanAgain: 'Scan again',
        back: 'Back'
      }
    : {
        title: 'تسجيل الحضور',
        hint: 'وجّه الكاميرا ناحية الكود اللي المسؤول بيعرضه.',
        camera: 'محتاجين إذن الكاميرا عشان نمسح الكود. فعّله من إعدادات المتصفح للموقع ده، وبعدين جرّب تاني.',
        retry: 'جرّب تاني',
        opening: 'جاري فتح الكاميرا...',
        success: 'تمام',
        scanAgain: 'امسح تاني',
        back: 'رجوع'
      }
  const video = useRef(null)
  const stream = useRef(null)
  const busy = useRef(false)
  const raf = useRef(0)
  const [state, setState] = useState('starting')
  const [result, setResult] = useState(null)

  function stop() {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }

  async function submit(token) {
    busy.current = true
    stop()
    const res = await fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await res.json().catch(() => ({
      code: 'error',
      message: en ? 'Something went wrong. Please try again.' : 'حصلت مشكلة. جرّب تاني.'
    }))
    setResult(data)
    setState('done')
  }

  async function start() {
    busy.current = false
    setResult(null)
    setState('starting')
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
      stream.current = media
      const currentVideo = video.current
      currentVideo.srcObject = media
      currentVideo.setAttribute('playsinline', 'true')
      await currentVideo.play()
      setState('scanning')
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      const tick = () => {
        if (busy.current || !stream.current) return
        if (currentVideo.videoWidth) {
          const width = 480
          const height = Math.round((currentVideo.videoHeight / currentVideo.videoWidth) * width)
          canvas.width = width
          canvas.height = height
          context.drawImage(currentVideo, 0, 0, width, height)
          const code = jsQR(context.getImageData(0, 0, width, height).data, width, height, { inversionAttempts: 'dontInvert' })
          if (code?.data) return submit(code.data)
        }
        raf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      setState('denied')
    }
  }

  useEffect(() => {
    start()
    return stop
  }, [])

  const ok = result && (result.code === 'ok' || result.code === 'already')

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-navy px-5 py-6 text-white">
      <Link href="/dashboard" className="text-sm text-sky underline">{c.back}</Link>
      <h1 className="mt-4 text-2xl font-bold">{c.title}</h1>
      {state !== 'done' && state !== 'denied' && (
        <>
          <p className="mt-1 text-sky">{c.hint}</p>
          <div className="mt-6 overflow-hidden rounded-3xl ring-4 ring-sky/40">
            <video ref={video} muted playsInline className="aspect-square w-full bg-black object-cover" />
          </div>
          {state === 'starting' && <p className="mt-4 text-center text-sky">{c.opening}</p>}
        </>
      )}
      {state === 'denied' && (
        <div className="mt-6 space-y-4 rounded-2xl bg-white p-5 text-navy">
          <p>{c.camera}</p>
          <button className="btn btn-red" onClick={start}>{c.retry}</button>
        </div>
      )}
      {state === 'done' && result && (
        <div className="mt-6 space-y-4 rounded-2xl bg-white p-6 text-center text-navy" role="status">
          <p className={`text-5xl ${ok ? 'text-green-600' : 'text-stage'}`} aria-hidden="true">{ok ? '✓' : '✕'}</p>
          <p className="text-lg font-bold">{result.message}</p>
          {ok ? <Link href="/dashboard" className="btn btn-navy">{c.success}</Link> : <button className="btn btn-red" onClick={start}>{c.scanAgain}</button>}
        </div>
      )}
    </main>
  )
}
