'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MessageList({ items }) {
  const router = useRouter()
  const [open, setOpen] = useState(null)
  const [readIds, setReadIds] = useState(() => new Set(items.filter((i) => i.read_at).map((i) => i.id)))

  async function toggle(item) {
    setOpen(open === item.id ? null : item.id)
    if (!readIds.has(item.id)) {
      await createClient().rpc('mark_message_read', { p_recipient_id: item.id })
      setReadIds(new Set([...readIds, item.id]))
      router.refresh()
    }
  }

  if (!items.length) return <p className="mt-8 rounded-xl bg-ice p-6 text-center text-navy/70">مفيش رسايل لحد دلوقتي. أي رسالة من المسؤول هتظهر هنا.</p>

  return (
    <ul className="mt-6 space-y-3">
      {items.map((it) => {
        const unread = !readIds.has(it.id)
        return (
          <li key={it.id} className="rounded-2xl bg-white ring-1 ring-navy/10">
            <button onClick={() => toggle(it)} className="flex w-full items-center justify-between gap-3 p-4 text-start" aria-expanded={open === it.id}>
              <span className="flex items-center gap-2">
                {unread && <span className="h-2.5 w-2.5 rounded-full bg-stage" aria-label="غير مقروءة" />}
                <span className={unread ? 'font-bold' : ''}>{it.title}</span>
              </span>
              <span className="text-xs text-navy/50">{new Date(it.created_at).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })}</span>
            </button>
            {open === it.id && <p className="whitespace-pre-wrap border-t border-navy/10 p-4 leading-7">{it.body}</p>}
          </li>
        )
      })}
    </ul>
  )
}
