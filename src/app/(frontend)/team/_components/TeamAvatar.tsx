/**
 * @fileType component
 * @domain marketing
 * @ai-summary Round team-member portrait framed by two slowly counter-rotating
 * "orbit" rings. Falls back to initials when the member has no photo yet.
 */
import Image from 'next/image'

import { cn } from '@/infra/utils/ui'

const SIZE_CLASSES = {
  card: { frame: 'h-36 w-36', photo: 'h-28 w-28' },
  dialog: { frame: 'h-32 w-32 sm:h-36 sm:w-36', photo: 'h-24 w-24 sm:h-28 sm:w-28' },
} as const

interface TeamAvatarProps {
  name: string
  image?: string
  size: keyof typeof SIZE_CLASSES
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
}

export function TeamAvatar({ name, image, size }: TeamAvatarProps) {
  const classes = SIZE_CLASSES[size]

  return (
    <div className={cn('relative flex shrink-0 items-center justify-center', classes.frame)}>
      <div
        aria-hidden
        className="absolute inset-3 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 opacity-60 blur-xl transition-opacity duration-slower group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-full border border-dashed border-primary/30 motion-safe:animate-[spin_24s_linear_infinite]"
      >
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary" />
      </div>
      <div
        aria-hidden
        className="absolute inset-2.5 rounded-full border border-accent/25 motion-safe:animate-[spin_16s_linear_infinite_reverse]"
      >
        <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent" />
      </div>
      <div
        className={cn(
          'relative overflow-hidden rounded-full border-2 border-primary/30 bg-muted transition-colors duration-slow group-hover:border-primary/60',
          classes.photo,
        )}
      >
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="112px"
            className="object-cover object-top transition-transform duration-slower group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center text-heading-xl font-bold text-primary-text"
          >
            {initialsOf(name)}
          </span>
        )}
      </div>
    </div>
  )
}
