'use client'

export default function GmailConnectButton({connected,email}){
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/10 space-y-3">
      <div>
        <h2 className="font-bold">ربط Gmail لإرسال تقارير الحضور</h2>
        <p className="mt-1 text-sm text-gray-600">{connected?'الحساب المتصل: '+(email||'Gmail'):'اربط حساب Gmail الذي سيُرسل ملفات Excel تلقائيًا بعد إغلاق الجلسة.'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="/api/admin/gmail/connect" className="btn btn-navy">{connected?'إعادة ربط Gmail':'ربط Gmail'}</a>
        {connected&&<form action="/api/admin/gmail/disconnect" method="post"><button className="btn" type="submit">فصل الحساب</button></form>}
      </div>
    </section>
  )
}
