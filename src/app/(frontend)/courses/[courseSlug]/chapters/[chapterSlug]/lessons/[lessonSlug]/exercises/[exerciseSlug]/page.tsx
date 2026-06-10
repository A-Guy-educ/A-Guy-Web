import { notFound } from 'next/navigation'

export default async function ExercisePage() {
  notFound()
}

export async function generateMetadata() {
  return {
    title: 'Exercise Not Found',
  }
}
