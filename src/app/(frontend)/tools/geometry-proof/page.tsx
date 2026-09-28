import { PROBLEMS } from '@/lib/geometry-engine/problems'
import { GeometryProofPage } from './GeometryProofPage'

export const metadata = {
  title: 'הוכחות גיאומטריה — כלי הוכחה',
}

export default function Page() {
  return <GeometryProofPage problems={PROBLEMS} />
}
