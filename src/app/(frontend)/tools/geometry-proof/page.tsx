import { PROBLEMS } from '@/lib/geometry-engine/problems'
import { GeometryProofPage } from './GeometryProofPage'

export const metadata = {
  title: 'הוכחות גיאומטריה — כלי הוכחה',
}

// Day 1 preview: showing only the parallelogram-diagonal-extension problem.
// Restore to `PROBLEMS` (all three) once the others are ready.
const VISIBLE = PROBLEMS.filter((p) => p.id === 'parallelogram-diagonal-extension')

export default function Page() {
  return <GeometryProofPage problems={VISIBLE} />
}
