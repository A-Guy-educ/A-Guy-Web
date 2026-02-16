/**
 * Integration tests for V2 Vision Detection Service
 *
 * Tests:
 * - renderPdfPageToImage successfully renders PDF pages without Buffer rejection
 * - detectExerciseBboxes processes PDF without throwing "Uint8Array" errors
 * - pdfjs-dist v4.x compatibility with Uint8Array conversion
 *
 * These tests verify the fix for pdfjs-dist v4.x Buffer rejection issue.
 */

import { describe, it, expect } from 'vitest'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Helper to create a minimal test PDF buffer
async function createTestPdfBuffer(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size: 8.5 x 11 inches
  const { height } = page.getSize()

  // Add some content
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  page.drawText('Test Exercise Page', {
    x: 50,
    y: height - 50,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  })

  // Add some rectangles to simulate exercise content
  page.drawRectangle({
    x: 50,
    y: height - 200,
    width: 200,
    height: 100,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

describe('V2 Vision Detection Service - pdfjs-dist Buffer Fix', () => {
  describe('renderPdfPageToImage', () => {
    it('should successfully render PDF page without Buffer rejection error', async () => {
      // Create a test PDF buffer
      const pdfBuffer = await createTestPdfBuffer()

      // Import the service function
      const { renderPdfPageToImage } =
        await import('@/server/services/exercise-conversion/v2/vision-detection-service')

      // This should NOT throw "Please provide binary data as <Uint8Array>, rather than <Buffer>"
      const result = await renderPdfPageToImage(pdfBuffer, 0)

      // Verify result structure
      expect(result).toBeDefined()
      expect(result.pageImageBuffer).toBeDefined()
      expect(result.pageWidth).toBeGreaterThan(0)
      expect(result.pageHeight).toBeGreaterThan(0)
    })

    it('should render multiple pages from multi-page PDF', async () => {
      // Create a multi-page test PDF
      const pdfDoc = await PDFDocument.create()

      // Add 3 pages
      for (let i = 0; i < 3; i++) {
        const page = pdfDoc.addPage([612, 792])
        page.drawText(`Page ${i + 1}`, {
          x: 50,
          y: 700,
          size: 24,
          font: await pdfDoc.embedFont(StandardFonts.Helvetica),
          color: rgb(0, 0, 0),
        })
      }

      const pdfBytes = await pdfDoc.save()
      const pdfBuffer = Buffer.from(pdfBytes)

      // Import the service function
      const { renderPdfPageToImage } =
        await import('@/server/services/exercise-conversion/v2/vision-detection-service')

      // Render each page - this should work for all pages
      for (let pageIndex = 0; pageIndex < 3; pageIndex++) {
        const result = await renderPdfPageToImage(pdfBuffer, pageIndex)

        expect(result).toBeDefined()
        expect(result.pageWidth).toBeGreaterThan(0)
        expect(result.pageHeight).toBeGreaterThan(0)
      }
    })

    it('should return valid PNG buffer with correct magic bytes', async () => {
      const pdfBuffer = await createTestPdfBuffer()

      const { renderPdfPageToImage } =
        await import('@/server/services/exercise-conversion/v2/vision-detection-service')

      const result = await renderPdfPageToImage(pdfBuffer, 0)

      // PNG magic bytes: 0x89 0x50 0x4E 0x47
      expect(result.pageImageBuffer[0]).toBe(0x89)
      expect(result.pageImageBuffer[1]).toBe(0x50)
      expect(result.pageImageBuffer[2]).toBe(0x4e)
      expect(result.pageImageBuffer[3]).toBe(0x47)
    })

    it('should handle various PDF buffer sizes correctly', async () => {
      // Test with minimal PDF (single page, no content)
      const minimalPdfDoc = await PDFDocument.create()
      minimalPdfDoc.addPage([100, 100])
      const minimalPdfBytes = await minimalPdfDoc.save()
      const minimalBuffer = Buffer.from(minimalPdfBytes)

      const { renderPdfPageToImage } =
        await import('@/server/services/exercise-conversion/v2/vision-detection-service')

      const result = await renderPdfPageToImage(minimalBuffer, 0)
      expect(result.pageWidth).toBeGreaterThan(0)
      expect(result.pageHeight).toBeGreaterThan(0)
    })
  })

  describe('detectExerciseBboxes', () => {
    it('should not throw Buffer rejection error when processing PDF', async () => {
      const pdfBuffer = await createTestPdfBuffer()

      // Create a mock payload for the function
      const mockPayload = {
        find: vi.fn().mockResolvedValue({ docs: [] }),
        create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      } as unknown as { find: unknown; create: unknown }

      const { detectExerciseBboxes } =
        await import('@/server/services/exercise-conversion/v2/vision-detection-service')

      // This should NOT throw "Please provide binary data" error
      const result = await detectExerciseBboxes(pdfBuffer, 0, mockPayload)

      // Result should be an array (possibly empty or with detected bboxes)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})

describe('V2 Uint8Array Conversion Pattern', () => {
  it('should correctly convert Buffer to Uint8Array', () => {
    const originalBuffer = Buffer.from([1, 2, 3, 4, 5])
    const uint8Array = new Uint8Array(originalBuffer)

    expect(uint8Array.length).toBe(5)
    expect(uint8Array[0]).toBe(1)
    expect(uint8Array[4]).toBe(5)
  })

  it('should preserve all bytes when converting large buffers', async () => {
    // Create a larger PDF
    const pdfDoc = await PDFDocument.create()
    for (let i = 0; i < 10; i++) {
      const page = pdfDoc.addPage([612, 792])
      page.drawText(`Page ${i + 1} with more content to make the buffer larger`, {
        x: 50,
        y: 700 - i * 20,
        size: 12,
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
        color: rgb(0, 0, 0),
      })
    }
    const pdfBytes = await pdfDoc.save()
    const buffer = Buffer.from(pdfBytes)

    // Convert using the pattern from the fix
    const uint8Array = new Uint8Array(buffer)

    // Verify all bytes are preserved
    expect(uint8Array.length).toBe(buffer.length)

    // Compare byte-by-byte
    for (let i = 0; i < buffer.length; i++) {
      expect(uint8Array[i]).toBe(buffer[i])
    }
  })
})
