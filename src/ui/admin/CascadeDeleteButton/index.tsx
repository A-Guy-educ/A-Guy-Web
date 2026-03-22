'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type CollectionSlug = 'courses' | 'chapters' | 'lessons'

const COLLECTION_LABELS: Record<CollectionSlug, string> = {
  courses: 'Course',
  chapters: 'Chapter',
  lessons: 'Lesson',
}

const DESCENDANT_DESCRIPTIONS: Record<CollectionSlug, string> = {
  courses: 'all chapters, lessons, and exercises',
  chapters: 'all lessons and exercises',
  lessons: 'all exercises',
}

const CascadeDeleteButton: React.FC<{ collection: CollectionSlug }> = ({ collection }) => {
  const { id } = useDocumentInfo()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showModal, setShowModal] = useState(false)

  const label = COLLECTION_LABELS[collection]
  const descendants = DESCENDANT_DESCRIPTIONS[collection]

  // Close modal on Escape key
  useEffect(() => {
    if (!showModal) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showModal])

  const handleCascadeDelete = useCallback(async () => {
    if (!id) return
    setIsDeleting(true)
    setResult(null)

    try {
      const response = await fetch(`/api/cascade-delete?collection=${collection}&id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({ success: true, message: data.message })
        setTimeout(() => {
          router.push(`/admin/collections/${collection}`)
        }, 1500)
      } else {
        setResult({ success: false, message: data.error || 'Cascade delete failed' })
      }
    } catch {
      setResult({ success: false, message: 'Network error — could not reach the server' })
    } finally {
      setIsDeleting(false)
    }
  }, [id, collection, router])

  if (!id) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={{
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 4,
          border: 'none',
          backgroundColor: '#dc2626',
          color: '#fff',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Cascade Delete
      </button>

      {showModal && (
        // Backdrop
        <div
          onClick={() => !isDeleting && setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--theme-elevation-0)',
              borderRadius: 8,
              padding: 24,
              maxWidth: 440,
              width: '90%',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 16,
                fontWeight: 700,
                color: '#dc2626',
              }}
            >
              Cascade Delete {label}
            </h3>

            <p
              style={{
                margin: '0 0 20px',
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--theme-elevation-800)',
              }}
            >
              This will permanently delete this {label.toLowerCase()} and{' '}
              <strong>{descendants}</strong> that belong to it. This action cannot be undone.
            </p>

            {result && (
              <p
                style={{
                  margin: '0 0 16px',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 4,
                  backgroundColor: result.success
                    ? 'rgba(22, 163, 74, 0.1)'
                    : 'rgba(220, 38, 38, 0.1)',
                  color: result.success ? '#16a34a' : '#dc2626',
                }}
              >
                {result.message}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setResult(null)
                }}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 4,
                  border: '1px solid var(--theme-elevation-300)',
                  backgroundColor: 'transparent',
                  color: 'var(--theme-elevation-800)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCascadeDelete}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Collection-specific wrappers for Payload's component registration
export const CourseCascadeDelete = () => <CascadeDeleteButton collection="courses" />
export const ChapterCascadeDelete = () => <CascadeDeleteButton collection="chapters" />
export const LessonCascadeDelete = () => <CascadeDeleteButton collection="lessons" />
