'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'
export default function GroupChat({groupId,name}){
 const[db]=useState(()=>createClient());const[msgs,setMsgs]=useState([]);const[text,setText]=useState('');const[uid,setUid]=useState(null);const end=useRef(null);const refreshTimer=useRef(null)
 const load=useCallback(async()=>{const{data}=await db.rpc('group_chat',{p_group:groupId});setMsgs(data||[])},[db,groupId])
 useEffect(()=>{load();db.auth.getUser().then(({data})=>setUid(data.user?.id));const channel=db.channel('group-chat-'+groupId).on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+groupId},()=>{clearTimeout(refreshTimer.current);refreshTimer.current=setTimeout(load,180)}).subscribe();return()=>{clearTimeout(refreshTimer.current);db.removeChannel(channel)}},[load,db,groupId])
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'})},[msgs])
 async function send(e){e.preventDefault();const body=text.trim();if(!body||!uid)return;setText('');const{error}=await db.from('group_messages').insert({group_id:groupId,sender_id:uid,body});if(error)setText(body)}
 return <main className="mx-auto flex h-dvh max-w-md flex-col bg-white"><header className="flex items-center gap-3 bg-navy px-4 py-3 text-white"><Link href="/chats" className="text-sm underline">رجوع</Link><h1 className="font-bold">{name}</h1></header><div className="flex-1 space-y-2 overflow-y-auto bg-ice p-3">{msgs.map(m=><div key={m.id} className={`flex ${m.mine?'justify-end':'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.mine?'bg-navy text-white':'bg-white ring-1 ring-navy/10'}`}>{!m.mine&&<p className="text-xs font-bold text-stage">{m.sender_name}</p>}<p className="whitespace-pre-wrap break-words">{m.body}</p><p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}</p></div></div>)}<div ref={end}/></div><form onSubmit={send} className="flex gap-2 border-t border-navy/10 bg-white p-3"><input className="input" value={text} maxLength={2000} onChange={e=>setText(e.target.value)} placeholder="اكتب رسالة"/><button className="rounded-xl bg-stage px-5 font-bold text-white">إرسال</button></form></main>
}
