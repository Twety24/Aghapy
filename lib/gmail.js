import 'server-only'
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const TOKEN_ROW=1
const TOKEN_URL='https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL='https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

function encryptionKey(){
  const value=process.env.GMAIL_TOKEN_ENCRYPTION_KEY||''
  if(!/^[a-f0-9]{64}$/i.test(value))throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be a 32-byte hex value')
  return Buffer.from(value,'hex')
}

function stateKey(){
  return createHmac('sha256',encryptionKey()).update('aghapy-gmail-oauth-state').digest()
}

export function createOAuthState(userId){
  const payload=Buffer.from(JSON.stringify({userId,nonce:randomBytes(24).toString('hex'),issuedAt:Date.now()})).toString('base64url')
  const signature=createHmac('sha256',stateKey()).update(payload).digest('base64url')
  return payload+'.'+signature
}

export function verifyOAuthState(value,userId){
  if(typeof value!=='string')return false
  const parts=value.split('.')
  if(parts.length!==2)return false
  const expected=createHmac('sha256',stateKey()).update(parts[0]).digest()
  let actual
  try{actual=Buffer.from(parts[1],'base64url')}catch{return false}
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false
  try{
    const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'))
    return payload.userId===userId&&Number.isFinite(payload.issuedAt)&&Date.now()-payload.issuedAt>=0&&Date.now()-payload.issuedAt<=10*60*1000
  }catch{return false}
}

function encrypt(value){
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv)
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()])
  return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.')
}

function decrypt(value){
  const [iv,tag,data]=String(value||'').split('.')
  if(!iv||!tag||!data)throw new Error('Stored Gmail token is invalid')
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(iv,'base64url'))
  decipher.setAuthTag(Buffer.from(tag,'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8')
}

export async function saveGmailConnection({refreshToken,email}){
  if(!refreshToken)throw new Error('Google did not return a refresh token. Disconnect the app in Google Account permissions and connect again.')
  const db=createAdminClient()
  const {error}=await db.from('gmail_oauth_tokens').upsert({
    id:TOKEN_ROW,
    refresh_token_encrypted:encrypt(refreshToken),
    gmail_address:email||null,
    connected_at:new Date().toISOString()
  },{onConflict:'id'})
  if(error)throw error
}

export async function getGmailConnection(){
  const db=createAdminClient()
  const {data,error}=await db.from('gmail_oauth_tokens').select('gmail_address,connected_at').eq('id',TOKEN_ROW).maybeSingle()
  if(error)throw error
  return data||null
}

export async function disconnectGmail(){
  const db=createAdminClient()
  const {error}=await db.from('gmail_oauth_tokens').delete().eq('id',TOKEN_ROW)
  if(error)throw error
}

export async function isGmailReady(db=createAdminClient()){
  if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.GMAIL_TOKEN_ENCRYPTION_KEY)return false
  const {data,error}=await db.from('gmail_oauth_tokens').select('id').eq('id',TOKEN_ROW).maybeSingle()
  if(error)throw error
  return !!data
}

async function getAccessToken(){
  const db=createAdminClient()
  const {data,error}=await db.from('gmail_oauth_tokens').select('refresh_token_encrypted').eq('id',TOKEN_ROW).single()
  if(error||!data?.refresh_token_encrypted)throw new Error('Gmail is not connected. Connect Gmail from Admin Settings.')
  const refreshToken=decrypt(data.refresh_token_encrypted)
  const body=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID||'',
    client_secret:process.env.GOOGLE_CLIENT_SECRET||'',
    refresh_token:refreshToken,
    grant_type:'refresh_token'
  })
  const response=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
  const result=await response.json().catch(()=>({}))
  if(!response.ok||!result.access_token)throw new Error(result.error_description||result.error||'Google could not refresh the Gmail access token')
  return result.access_token
}

function wrapBase64(value){
  return value.match(/.{1,76}/g)?.join('\r\n')||''
}

function safeFilename(value){
  return String(value||'report.xlsx').replace(/[\r\n"]/g,'_')
}

export async function sendGmailReport({to,attachments,meetingDate}){
  const accessToken=await getAccessToken()
  const boundary='aghapy_'+randomUUID().replace(/-/g,'')
  const subject='Aghapy Team - Attendance Report - '+(meetingDate||'')
  const bodyText='Dear Aghapy Team Administrator,\n\nThe attendance session on '+(meetingDate||'the scheduled date')+' has been completed.\n\nAttached are the attendance reports:\n1. Present Members.xlsx\n2. Absent Members.xlsx\n\nAghapy Team Attendance System'
  const parts=[
    'To: '+to,
    'Subject: '+subject,
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="'+boundary+'"',
    '',
    '--'+boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(bodyText,'utf8').toString('base64'))
  ]
  for(const attachment of attachments||[]){
    parts.push(
      '--'+boundary,
      'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="'+safeFilename(attachment.filename)+'"',
      'Content-Disposition: attachment; filename="'+safeFilename(attachment.filename)+'"',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(attachment.buffer.toString('base64'))
    )
  }
  parts.push('--'+boundary+'--','')
  const raw=Buffer.from(parts.join('\r\n'),'utf8').toString('base64url')
  const response=await fetch(GMAIL_SEND_URL,{
    method:'POST',
    headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
    body:JSON.stringify({raw})
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(result.error?.message||'Gmail send failed with status '+response.status)
  return result
}
