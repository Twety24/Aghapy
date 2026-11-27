'use client'

const DB_NAME = 'aghapy-pending-signup'
const STORE_NAME = 'photos'
const PHOTO_KEY = 'pending-avatar'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePendingAvatar(file) {
  const db = await openDB()
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put({ blob: file, name: file.name, type: file.type }, PHOTO_KEY)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function getPendingAvatar() {
  const db = await openDB()
  const value = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(PHOTO_KEY)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  if (!value?.blob) return null
  return new File([value.blob], value.name || 'profile-photo', { type: value.type || value.blob.type })
}

export async function clearPendingAvatar() {
  const db = await openDB()
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(PHOTO_KEY)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}
