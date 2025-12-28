'use client'

import Link from 'next/link'
import type { Course } from '@/payload-types'
import { useTranslations } from '@/providers/I18n'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
  const t = useTranslations('courses')

  if (!course.slug) {
    return null
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="mb-2">
          <span className="text-sm font-semibold text-muted-foreground">{course.courseLabel}</span>
        </div>
        <CardTitle className="text-2xl">{course.title}</CardTitle>
        {course.description && (
          <CardDescription className="line-clamp-3">{course.description}</CardDescription>
        )}
      </CardHeader>
      <CardFooter>
        <Button asChild>
          <Link href={`/courses/${course.slug}`}>{t('openCourse')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
