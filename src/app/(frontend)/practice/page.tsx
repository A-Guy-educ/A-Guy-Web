import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { StudyContent } from '../study/_components/StudyContent'
import {
  resolveLearningPageSelection,
  type LearningPageSearchParams,
} from '../study/learningPageSelection'
import { readRequestCourseSelection } from '../study/requestCourseSelection'
import { prefetchStudyData } from '@/server/repos/queries/study-page'

interface PracticePageProps {
  searchParams: Promise<LearningPageSearchParams>
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const params = await searchParams
  const stored = await readRequestCourseSelection()
  const selection = resolveLearningPageSelection({
    cookieCourseId: stored.courseId,
    cookieGrade: stored.grade,
    searchParams: params,
    systemLocale: await getSystemLocale(),
  })

  const prefetchedData = selection.grade
    ? await prefetchStudyData(
        selection.grade,
        selection.contentLocale,
        'practice',
        selection.courseId,
      )
    : null

  return (
    <div>
      <StudyContent lessonType="practice" prefetchedData={prefetchedData} />
    </div>
  )
}

export async function generateMetadata() {
  return pageMetadata({
    title: 'תרגול',
    description: 'תרגל נושאים',
  })
}
