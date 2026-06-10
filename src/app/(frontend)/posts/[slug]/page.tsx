import type { Metadata } from 'next'

import { Redirects } from '@/ui/web/Redirects'
import RichText from '@/ui/web/RichText'

import { generateMeta } from '@/infra/utils/generateMeta'
import { queryAllPostSlugs, queryPostBySlug } from '@/server/repos/queries/posts'
import { PostHero } from '@/ui/web/heros/PostHero'
import PageClient from './page.client'

export async function generateStaticParams() {
  try {
    const params = await queryAllPostSlugs()
    return params
  } catch {
    // Gracefully handle MongoDB connection failures during build
    // Return empty array to allow build to continue
    return []
  }
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug

  let post
  try {
    post = await queryPostBySlug({ slug: decodedSlug })
  } catch (error) {
    // Gracefully handle MongoDB connection failures during build
    console.warn('Failed to fetch post:', error)
    return (
      <article className="pt-section-md pb-section-md">
        <PageClient />
        <Redirects disableNotFound url={url} />
        <div className="container">
          <p>Post content is temporarily unavailable.</p>
        </div>
      </article>
    )
  }

  if (!post) return <Redirects url={url} />

  return (
    <article className="pt-section-md pb-section-md">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <Redirects disableNotFound url={url} />

      <PostHero post={post} />

      <div className="flex flex-col items-center gap-content-gap pt-content-gap-lg">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  return generateMeta({ doc: post })
}
