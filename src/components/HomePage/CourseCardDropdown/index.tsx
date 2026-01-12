'use client'

import type { Course } from '@/payload-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utilities/ui'
import { BookOpen } from 'lucide-react'

interface CourseCardDropdownProps {
  course: Course
  className?: string
  onClick?: () => void
}

export function CourseCardDropdown({ course, className, onClick }: CourseCardDropdownProps) {
  if (!course.slug) {
    return null
  }

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1',
        'border-border bg-card hover:bg-muted/50',
        'rounded-xl overflow-hidden',
        className,
      )}
      onClick={onClick}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {course.courseLabel && (
              <Badge variant="secondary" className="mb-2 text-xs font-semibold w-fit">
                {course.courseLabel}
              </Badge>
            )}
            <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </CardTitle>
          </div>
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </CardHeader>

      {course.description && (
        <CardContent className="relative pt-0">
          <CardDescription className="text-sm line-clamp-2 text-muted-foreground">
            {course.description}
          </CardDescription>
        </CardContent>
      )}
    </Card>
  )
}
