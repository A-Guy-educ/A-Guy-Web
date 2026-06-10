const collectionPrefixMap = {
  pages: '',
} as const

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
}

export const generatePreviewPath = ({ collection, slug }: Props) => {
  if (slug === undefined || slug === null) {
    return null
  }

  const encodedSlug = encodeURIComponent(slug)
  const encodedParams = new URLSearchParams({
    slug: encodedSlug,
    collection,
    path: `${collectionPrefixMap[collection]}/${encodedSlug}`,
    previewSecret: process.env.PREVIEW_SECRET || '',
  })

  return `/next/preview?${encodedParams.toString()}`
}
