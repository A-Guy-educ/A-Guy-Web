import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

interface MathBulletListProps {
  bullets: string[]
}

export function MathBulletList({ bullets }: MathBulletListProps) {
  return (
    <ul className="list-disc space-y-2 ps-5 text-body-md leading-relaxed text-foreground marker:text-primary">
      {bullets.map((bullet, index) => (
        <li key={index}>
          <MathMarkdown content={bullet} />
        </li>
      ))}
    </ul>
  )
}
