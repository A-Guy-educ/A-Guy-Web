/**
 * V2 PDF to Exercises Task Handler
 *
 * Orchestrates the V2 image crop pipeline:
 * 1. Fetch PDF from Vercel Blob
 * 2. For each page: render, detect bboxes, crop exercises
 * 3. Upload cropped images as Media
 * 4. Create Exercises with rich_text blocks referencing the images
 *
 * @fileType job-task
 * @domain conversion
 * @pattern job-handler, pipeline-orchestration
 */

import { PDF_MAX_BYTES, TASK_SLUGS } from '@/server/config/constants'
import { getPdfBufferFromBlob } from '@/server/services/pdf-fetcher'
import { getPageCount } from '@/server/utils/pdf-metadata'
import config from '@payload-config'
import { ObjectId } from 'mongodb'
import { getPayload, type Payload } from 'payload'
import { nanoid } from 'nanoid'

import { detectExerciseBboxes } from '@/server/services/exercise-conversion/v2/vision-detection-service'
import { cropExerciseImage } from '@/server/services/exercise-conversion/v2/image-crop-service'
import type { PdfToExercisesV2Output } from '@/server/payload/jobs/types'

/**
 * V2 Job Input Interface (extends base types)
 */
interface V2JobInput {
  ctx: {
    lessonId: string
    sourceDocId: string
    tenantId: string
    pipelineVersion: number
    conversionMode: string
  }
}

/**
 * V2 Task Handler
 */
export const pdfToExercisesV2Task = {
  slug: TASK_SLUGS.PDF_TO_EXERCISES_V2,
  input: {},
  output: {},

  async handler({ job, req }: { job: any; req: any }) {
    // Use req.payload when available (testability), fallback to getPayload
    const payload = req.payload ?? (await getPayload({ config }))
    const input = job.input as V2JobInput
    const { lessonId, sourceDocId, tenantId } = input.ctx

    const output: PdfToExercisesV2Output = {
      pagesTotal: 0,
      pagesProcessed: 0,
      exercisesCreated: 0,
      errors: [],
      warnings: [],
    }

    try {
      // Fetch media document
      const media = await payload.findByID({
        collection: 'media',
        id: sourceDocId,
        depth: 0,
        overrideAccess: true,
      })

      if (!media || !media.url) {
        throw {
          stage: 'PASS0_EXTRACT',
          code: 'MEDIA_NOT_FOUND',
          message: 'Media document has no URL',
        }
      }

      // PASS 0: Load and Validate PDF from Vercel Blob
      const pdfBuffer = await getPdfBufferFromBlob(sourceDocId, payload, req)

      if (pdfBuffer.length > PDF_MAX_BYTES) {
        throw { stage: 'PASS0_EXTRACT', code: 'PDF_TOO_LARGE', message: 'PDF too large' }
      }

      // Get page count
      const pageCount = await getPageCount(pdfBuffer)
      output.pagesTotal = pageCount

      // PASS 1: Process each page
      let exerciseCounter = 0

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        try {
          console.log(`[V2] Processing page ${pageIndex + 1}/${pageCount}`)

          // Detect bounding boxes on this page
          const detectionResult = await detectExerciseBboxes(pdfBuffer, pageIndex, payload)

          // Process each detected bounding box
          for (const detection of detectionResult.detections) {
            try {
              // Crop the exercise image
              const croppedBuffer = await cropExerciseImage(
                detectionResult.pageImageBuffer,
                detectionResult.pageWidth,
                detectionResult.pageHeight,
                detection.bbox,
              )

              // Upload cropped image to Media collection
              const mediaDoc = await payload.create({
                collection: 'media',
                data: {
                  tenant: tenantId,
                  type: 'image',
                  alt: `Exercise crop p${pageIndex + 1}`,
                  filename: `exercise-p${pageIndex + 1}-${exerciseCounter}.png`,
                },
                file: {
                  data: croppedBuffer,
                  mimetype: 'image/png',
                  name: `exercise-p${pageIndex + 1}-${exerciseCounter}.png`,
                  size: croppedBuffer.length,
                },
                overrideAccess: true,
                req,
              })

              // Generate title
              const exerciseLabel = detection.label || String(exerciseCounter + 1)
              const title = `Exercise ${exerciseLabel}`

              // Create Exercise with rich_text block containing the image
              await payload.create({
                collection: 'exercises',
                data: {
                  title,
                  lesson: lessonId,
                  tenant: tenantId,
                  origin: 'conversion',
                  sourceDoc: sourceDocId,
                  conversionJobId: job.id,
                  sourcePageIndex: pageIndex,
                  sourceBboxNormalized: detection.bbox,
                  pipelineVersion: 2,
                  content: {
                    blocks: [
                      {
                        id: nanoid(),
                        type: 'rich_text',
                        format: 'md-math-v1',
                        value: '',
                        mediaIds: [mediaDoc.id],
                      },
                    ],
                  },
                },
                overrideAccess: true,
                req,
              })

              exerciseCounter++
              output.exercisesCreated++
            } catch (cropError: any) {
              // Log failed crop but continue with other exercises
              console.warn(`[V2] Failed to process crop on page ${pageIndex}:`, cropError.message)
              output.errors.push({
                pageIndex,
                bbox: detection.bbox,
                reason: cropError.message || 'Unknown crop error',
              })
            }
          }

          output.pagesProcessed++
        } catch (pageError: any) {
          console.error(`[V2] Failed to process page ${pageIndex}:`, pageError.message)
          output.errors.push({
            pageIndex,
            reason: pageError.message || 'Unknown page processing error',
          })
        }
      }

      // Check for zero exercises created
      if (output.exercisesCreated === 0) {
        if (output.errors.length > 0) {
          output.warnings.push(
            `All ${output.errors.length} page(s) failed to process. See errors for details.`,
          )
        } else {
          output.warnings.push('Model returned no bounding boxes across all pages.')
        }
      }

      // Mark job as completed
      await updateJobStatus(payload, job.id, 'completed', output)
      return output
    } catch (error: any) {
      console.error(`[V2] Job ${job.id} failed:`, error)
      await updateJobStatus(payload, job.id, 'failed', {
        ...output,
        error: error.message,
      })
      throw error
    }
  },
}

/**
 * Update job status in MongoDB
 */
async function updateJobStatus(
  payload: Payload,
  jobId: string,
  status: 'completed' | 'failed',
  output?: unknown,
): Promise<void> {
  const db = payload.db as any
  const coll = db.connection?.collection?.('payload-jobs')
  if (!coll) {
    console.warn('[V2] Cannot update job status - jobs collection not accessible')
    return
  }

  const update: any = {
    processing: false,
    completedAt: new Date(),
    hasError: status === 'failed',
  }

  if (output) {
    update.jobOutput = output
  }

  try {
    await coll.updateOne({ _id: new ObjectId(jobId) }, { $set: update })
  } catch (err) {
    console.error(`[V2] Failed to update job status:`, err)
  }
}
