import { cookies } from 'next/headers'
export async function getLang() {
  const store = await cookies()
  return store.get('lang')?.value === 'en' ? 'en' : 'ar'
}
