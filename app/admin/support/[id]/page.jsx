import SupportViewer from '@/components/SupportViewer'
export const dynamic = 'force-dynamic'
export default async function Page({ params }) {
  const { id } = await params
  return <SupportViewer sessionId={id} />
}
