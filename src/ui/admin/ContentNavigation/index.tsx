'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ParentRecord {
  id: string
  title?: string
  adminTitle?: string
  courseLabel?: string
}

interface HierarchyData {
  lesson?: ParentRecord | null
  chapter?: ParentRecord | null
  course?: ParentRecord | null
}

type CollectionContext = 'exercises' | 'lessons'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Resolve a relationship field value to an ID string. */
function resolveId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: unknown }).id)
  }
  return null
}

/** Display name for a record, with fallback. */
function displayName(record: ParentRecord | null | undefined): string {
  if (!record) return 'Not assigned'
  return record.adminTitle || record.title || record.courseLabel || record.id
}

/** Build admin edit URL for a collection record. */
function adminUrl(collection: string, id: string): string {
  return `/admin/collections/${collection}/${id}`
}

/* ------------------------------------------------------------------ */
/*  Fetch helpers                                                      */
/* ------------------------------------------------------------------ */

async function fetchRecord(collection: string, id: string): Promise<ParentRecord | null> {
  try {
    const res = await fetch(
      `/api/${collection}/${id}?depth=0&select[title]=true&select[adminTitle]=true&select[courseLabel]=true`,
      { credentials: 'include' },
    )
    if (!res.ok) return null
    const data = await res.json()
    return {
      id: data.id,
      title: data.title,
      adminTitle: data.adminTitle,
      courseLabel: data.courseLabel,
    }
  } catch {
    return null
  }
}

async function fetchRelationshipId(
  collection: string,
  id: string,
  field: string,
): Promise<string | null> {
  try {
    const res = await fetch(`/api/${collection}/${id}?depth=0&select[${field}]=true`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    return resolveId(data[field])
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const ContentNavigation: React.FC<{ context: CollectionContext }> = ({ context }) => {
  const { id: docId } = useDocumentInfo()

  // Read the direct parent relationship from form state
  const parentField = useFormFields(([fields]) =>
    context === 'exercises' ? fields.lesson : fields.chapter,
  )
  const parentId = resolveId(parentField?.value)

  const [hierarchy, setHierarchy] = useState<HierarchyData>({})
  const [loading, setLoading] = useState(false)

  const fetchHierarchy = useCallback(async () => {
    if (!parentId) {
      setHierarchy({})
      return
    }

    setLoading(true)

    try {
      if (context === 'exercises') {
        // Exercise: parent is lesson -> chapter -> course
        const lesson = await fetchRecord('lessons', parentId)
        let chapter: ParentRecord | null = null
        let course: ParentRecord | null = null

        if (lesson) {
          const chapterId = await fetchRelationshipId('lessons', parentId, 'chapter')
          if (chapterId) {
            chapter = await fetchRecord('chapters', chapterId)
            const courseId = await fetchRelationshipId('chapters', chapterId, 'course')
            if (courseId) {
              course = await fetchRecord('courses', courseId)
            }
          }
        }

        setHierarchy({ lesson, chapter, course })
      } else {
        // Lesson: parent is chapter -> course
        const chapter = await fetchRecord('chapters', parentId)
        let course: ParentRecord | null = null

        if (chapter) {
          const courseId = await fetchRelationshipId('chapters', parentId, 'course')
          if (courseId) {
            course = await fetchRecord('courses', courseId)
          }
        }

        setHierarchy({ chapter, course })
      }
    } catch {
      setHierarchy({})
    } finally {
      setLoading(false)
    }
  }, [parentId, context])

  useEffect(() => {
    void fetchHierarchy()
  }, [fetchHierarchy])

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (!docId && !parentId) {
    return (
      <div style={styles.container}>
        <div style={styles.label}>Content Hierarchy</div>
        <p style={styles.empty}>Save the document to see navigation links.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.label}>Content Hierarchy</div>
        <p style={styles.empty}>Loading hierarchy...</p>
      </div>
    )
  }

  // Build breadcrumb segments
  const breadcrumbs: { label: string; collection: string; id?: string }[] = []

  if (hierarchy.course?.id) {
    breadcrumbs.push({
      label: displayName(hierarchy.course),
      collection: 'courses',
      id: hierarchy.course.id,
    })
  } else if (context === 'exercises' || context === 'lessons') {
    breadcrumbs.push({ label: 'Not assigned', collection: 'courses' })
  }

  if (hierarchy.chapter?.id) {
    breadcrumbs.push({
      label: displayName(hierarchy.chapter),
      collection: 'chapters',
      id: hierarchy.chapter.id,
    })
  } else if (context === 'exercises' || context === 'lessons') {
    breadcrumbs.push({ label: 'Not assigned', collection: 'chapters' })
  }

  if (context === 'exercises') {
    if (hierarchy.lesson?.id) {
      breadcrumbs.push({
        label: displayName(hierarchy.lesson),
        collection: 'lessons',
        id: hierarchy.lesson.id,
      })
    } else {
      breadcrumbs.push({ label: 'Not assigned', collection: 'lessons' })
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.label}>Content Hierarchy</div>

      {/* Breadcrumb */}
      <nav style={styles.breadcrumb} aria-label="Content hierarchy breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.collection}-${i}`} style={styles.breadcrumbItem}>
            {i > 0 && <span style={styles.separator}>{' > '}</span>}
            {crumb.id ? (
              <a
                href={adminUrl(crumb.collection, crumb.id)}
                style={styles.breadcrumbLink}
                title={`Go to ${crumb.label}`}
              >
                {crumb.label}
              </a>
            ) : (
              <span style={styles.notAssigned}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Parent links */}
      <div style={styles.links}>
        {context === 'exercises' && (
          <ParentLink label="Lesson" record={hierarchy.lesson} collection="lessons" />
        )}
        <ParentLink label="Chapter" record={hierarchy.chapter} collection="chapters" />
        <ParentLink label="Course" record={hierarchy.course} collection="courses" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ParentLink sub-component                                           */
/* ------------------------------------------------------------------ */

const ParentLink: React.FC<{
  label: string
  record: ParentRecord | null | undefined
  collection: string
}> = ({ label, record, collection }) => {
  const name = displayName(record)

  return (
    <div style={styles.linkRow}>
      <span style={styles.linkLabel}>{label}:</span>
      {record?.id ? (
        <a
          href={adminUrl(collection, record.id)}
          style={styles.linkValue}
          title={`Navigate to ${name}`}
        >
          {name}
        </a>
      ) : (
        <span style={styles.notAssigned}>{name}</span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 0',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--theme-elevation-800)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  empty: {
    fontSize: '13px',
    color: 'var(--theme-elevation-500)',
    margin: 0,
  },
  breadcrumb: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2px',
    marginBottom: '12px',
    padding: '8px 10px',
    backgroundColor: 'var(--theme-elevation-50)',
    borderRadius: '4px',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  breadcrumbItem: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  separator: {
    color: 'var(--theme-elevation-400)',
    margin: '0 2px',
    fontSize: '11px',
  },
  breadcrumbLink: {
    color: 'var(--theme-text)',
    textDecoration: 'none',
    fontWeight: 500,
    borderBottom: '1px solid transparent',
    transition: 'border-color 0.15s',
  },
  notAssigned: {
    color: 'var(--theme-elevation-400)',
    fontStyle: 'italic',
    fontSize: '12px',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  linkRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    fontSize: '13px',
  },
  linkLabel: {
    fontWeight: 600,
    color: 'var(--theme-elevation-600)',
    flexShrink: 0,
    minWidth: '56px',
  },
  linkValue: {
    color: 'var(--theme-text)',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    textDecorationColor: 'var(--theme-elevation-300)',
    wordBreak: 'break-word',
  },
}

/* ------------------------------------------------------------------ */
/*  Exports — named wrappers for each collection                       */
/* ------------------------------------------------------------------ */

export const ExerciseNavigation: React.FC = () => <ContentNavigation context="exercises" />
export const LessonNavigation: React.FC = () => <ContentNavigation context="lessons" />

export default ContentNavigation
