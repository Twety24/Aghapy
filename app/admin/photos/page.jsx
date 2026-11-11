import { redirect } from 'next/navigation'
import { getSeniorAdmin } from '@/lib/guard'
import AdminPhotos from '@/components/AdminPhotos'
export default async function Page() {
  if (!(await getSeniorAdmin())) redirect('/admin/attendance')
  return <AdminPhotos />
}
