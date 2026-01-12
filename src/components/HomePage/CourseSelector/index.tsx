'use client'

import { useEffect, useState, useRef } from 'react'
import { CourseCardDropdown } from '@/components/HomePage/CourseCardDropdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import { ChevronDown } from 'lucide-react'
import type { Course } from '@/payload-types'

interface CourseSelectorProps {
  onCourseSelect?: (course: Course) => void
  selectedCourseSlug?: string
  className?: string
}

export function CourseSelector({
  onCourseSelect,
  selectedCourseSlug,
  className,
}: CourseSelectorProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string>(selectedCourseSlug || '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch('/api/courses')
        if (response.ok) {
          const data = await response.json()
          setCourses(data.docs || [])
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleCourseClick = (course: Course) => {
    if (course.slug) {
      setSelectedSlug(course.slug)
      onCourseSelect?.(course)
      setOpen(false)
    }
  }

  const selectedCourse = courses.find((c) => c.slug === selectedSlug)

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        className={cn(
          'w-full justify-between',
          !selectedCourse && 'text-muted-foreground',
          className,
        )}
        disabled={isLoading}
        onClick={() => setOpen(!open)}
      >
        {isLoading ? 'טוען קורסים...' : selectedCourse?.title || 'בחר קורס'}
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform',
            open && 'rotate-180',
          )}
        />
      </Button>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-full rounded-md border bg-popover p-4 text-popover-foreground shadow-md',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          <div className="grid gap-3 max-h-[400px] overflow-y-auto">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course)}
                className="cursor-pointer"
              >
                <CourseCardDropdown
                  course={course}
                  className={cn(
                    selectedSlug === course.slug && 'ring-2 ring-primary ring-offset-2',
                  )}
                />
              </div>
            ))}
            {courses.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-4 text-sm">
                אין קורסים זמינים
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
