self.addEventListener('install',()=>self.skipWaiting())
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()))
self.addEventListener('fetch',()=>{})
self.addEventListener('notificationclick',event=>{
 event.notification.close()
 const target=event.notification.data?.url||'/dashboard'
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
  for(const client of windows){if('focus'in client){client.navigate(target);return client.focus()}}
  return clients.openWindow(target)
 }))
})
self.addEventListener('push',event=>{
 let data={}
 try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||''}}
 event.waitUntil(self.registration.showNotification(data.title||'Aghapy Team',{body:data.body||'لديك إشعار جديد',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',data:{url:data.url||'/dashboard'}}))
})