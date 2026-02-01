/**
 * Tests for PDF segmentation using pdfjs-dist legacy build
 * Verifies the fix for Node.js ESM worker compatibility
 *
 * @see src/server/payload/jobs/pdf-to-exercises-task.ts
 */
import { describe, expect, it } from 'vitest'

describe('PDF Segmentation with Legacy Build', () => {
  // Minimal valid PDF for testing (1 page)
  const createMinimalPdf = () =>
    Buffer.from(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer << /Size 4 /Root 1 0 R >>
startxref
196
%%EOF`)

  it('should import pdfjs-dist legacy build without error', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    expect(pdfjs).toBeDefined()
    expect(pdfjs.getDocument).toBeDefined()
  })

  it('should load PDF document from buffer', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdfBuffer = createMinimalPdf()

    const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(pdfBuffer) })
    const pdf = await loadingTask.promise

    expect(pdf).toBeDefined()
    expect(pdf.numPages).toBe(1)
  })

  it('should work without explicit worker configuration in Node.js', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

    // Legacy build has a default workerSrc but works in Node.js without
    // needing to configure it - no HTTPS URL fetching or blob URL creation needed
    // The key point: it does NOT require us to set GlobalWorkerOptions.workerSrc
    // to an HTTPS URL that would fail with "ESM loader protocol" error

    const pdfBuffer = createMinimalPdf()
    // This should work without any worker configuration
    const pdf = await pdfjs.getDocument({ data: Uint8Array.from(pdfBuffer) }).promise

    expect(pdf.numPages).toBe(1)
  })

  it('should segment PDF correctly', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdfBuffer = createMinimalPdf()

    const pdf = await pdfjs.getDocument({ data: Uint8Array.from(pdfBuffer) }).promise
    const pageCount = pdf.numPages

    // Simulate segmentation logic from pdf-to-exercises-task.ts
    const maxPagesPerSegment = 5
    const segments: { pageStart: number; pageEnd: number; pageCount: number }[] = []

    for (let start = 1; start <= pageCount; start += maxPagesPerSegment) {
      const end = Math.min(start + maxPagesPerSegment - 1, pageCount)
      segments.push({ pageStart: start, pageEnd: end, pageCount: end - start + 1 })
    }

    expect(segments).toHaveLength(1)
    expect(segments[0]).toEqual({ pageStart: 1, pageEnd: 1, pageCount: 1 })
  })
})
