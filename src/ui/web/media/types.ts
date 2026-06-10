import type { StaticImageData } from 'next/image'
import type { ElementType, Ref } from 'react'

import type { Media as MediaType } from '@/infra/types/content'

export interface Props {
  alt?: string
  className?: string
  fill?: boolean // for NextImage only
  htmlElement?: ElementType | null
  pictureClassName?: string
  imgClassName?: string
  onClick?: () => void
  onLoad?: () => void
  loading?: 'lazy' | 'eager' // for NextImage only
  priority?: boolean // for NextImage only
  ref?: Ref<HTMLImageElement | HTMLVideoElement | null>
  resource?: MediaType | string | number | null
  size?: string // for NextImage only
  src?: StaticImageData // for static media
  videoClassName?: string
  page?: number // for PDF only - page number to display
  lessonId?: string // for PDF only - lesson load failure tracking
  courseId?: string // for PDF only - lesson load failure tracking
}
