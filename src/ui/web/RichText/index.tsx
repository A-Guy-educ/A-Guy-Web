import type React from 'react'

import { cn } from '@/infra/utils/ui'

type Props = {
  data?: unknown
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

function toText(data: unknown): string {
  if (typeof data === 'string') return data
  if (!data) return ''
  return ''
}

export default function RichText(props: Props) {
  const { className, data, enableProse = true, enableGutter = true, ...rest } = props
  const text = toText(data)

  if (!text) {
    return null
  }

  return (
    <div
      className={cn(
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      {...rest}
    >
      {text}
    </div>
  )
}
