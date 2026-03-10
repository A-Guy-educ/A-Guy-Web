'use client'

import { BarChart3, GraduationCap, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { Chapter, Course, Lesson } from '@/payload-types'
import { useTranslations } from '@/ui/web/providers/I18n'
import { useExamCountdown } from '@/client/hooks/useExamCountdown'
import { CourseAnalytics } from '../CourseAnalytics'
import { CourseTabs, type CourseTab } from '../CourseTabs'
import { ExamReminderBubble } from '../ExamReminderBubble'
import { LearnTab } from '../LearnTab'
import { PracticeTab } from '../PracticeTab'
import { AskTab } from '../AskTab'
import { ExamsTab } from '../ExamsTab'

interface CoursePageContentProps {
  course: Course
  chapters: Chapter[]
  lessons: Lesson[]
  courseSlug: string
}

export function CoursePageContent({
  course,
  chapters,
  lessons,
  courseSlug,
}: CoursePageContentProps) {
  const t = useTranslations('coursePage')
  const [activeTab, setActiveTab] = useState<CourseTab>('learn')
  const { hasUpcomingExam, daysUntil } = useExamCountdown(course.id)

  return (
    <>
      <CourseAnalytics courseId={course.id} courseTitle={course.title} />
      <CourseTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Centered title area - gradient background */}
      <div className="w-full py-6 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-5xl mx-auto text-center">
          {hasUpcomingExam && daysUntil !== null && <ExamReminderBubble daysUntil={daysUntil} />}
          <h1 className="text-3xl md:text-4xl font-black text-foreground mt-4">{course.title}</h1>
          <p className="text-sm md:text-base font-extrabold text-primary mt-2 uppercase tracking-[0.3em]">
            {t('grade')} {course.courseLabel}
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-6 py-6 max-w-5xl">
        {activeTab === 'learn' && (
          <LearnTab lessons={lessons} chapters={chapters} courseSlug={courseSlug} />
        )}
        {activeTab === 'practice' && (
          <PracticeTab lessons={lessons} chapters={chapters} courseSlug={courseSlug} />
        )}
        {activeTab === 'ask' && <AskTab courseId={course.id} />}
        {activeTab === 'exams' && <ExamsTab courseId={course.id} />}

        {/* Footer actions with divider */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center gap-2 text-sm font-bold text-foreground bg-card border border-border px-6 py-3 rounded-full hover:bg-muted/50 transition-all">
              <BarChart3 className="w-4 h-4" />
              {t('statsAndPerformance')}
            </button>
            <button className="flex items-center justify-center gap-2 text-sm font-bold text-primary-foreground bg-primary px-6 py-3 rounded-full shadow-lg hover:opacity-90 transition-all">
              <GraduationCap className="w-4 h-4" />
              {t('upcomingExam')}
            </button>
            <button className="flex items-center justify-center gap-2 text-sm font-bold text-foreground bg-card border border-border px-6 py-3 rounded-full hover:bg-muted/50 transition-all">
              <Sparkles className="w-4 h-4" />
              {t('bagrutTransition')}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
