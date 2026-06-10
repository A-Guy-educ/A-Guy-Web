import { notFound } from 'next/navigation'

export default async function CompletePage() {
  notFound()
}

export async function generateMetadata() {
  return { title: 'Lesson Complete' }
}
