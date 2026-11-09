// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AskExerciseCard } from '@/app/(frontend)/ask/_components/AskExerciseCard'
import type { ExerciseFile } from '@/app/(frontend)/ask/_components/ask-types'
import { I18nProvider } from '@/ui/web/providers/I18n'

const messages = { homepage: { ask: { generateLesson: 'Generate' } } }

const uploaded: ExerciseFile = {
  id: 1,
  title: 'homework',
  url: 'https://blob.example.com/homework.jpg',
  date: '',
  mediaId: 'media-1',
  filename: '123-home work.jpg',
  mimeType: 'image/jpeg',
}

function renderCard(file: ExerciseFile) {
  return render(
    <I18nProvider locale="en" messages={messages}>
      <AskExerciseCard file={file} onGenerate={vi.fn()} generationStatus="idle" />
    </I18nProvider>,
  )
}

describe('AskExerciseCard', () => {
  it('has no notebook button; the notebook lives in the pane header', () => {
    renderCard(uploaded)

    expect(screen.queryByText(/notebook/i)).toBeNull()
  })

  it('shows the image through the same-origin proxy so it can be cut', () => {
    renderCard(uploaded)

    const image = screen.getByAltText('homework')
    expect(image.getAttribute('src')).toBe('/api/media/file/123-home%20work.jpg?inline=1')
    expect(image.hasAttribute('data-cut-surface')).toBe(true)
  })

  it('shows the local preview while the file is still uploading', () => {
    renderCard({
      ...uploaded,
      url: 'blob:http://localhost/1',
      filename: undefined,
      mediaId: undefined,
      isUploading: true,
    })

    expect(screen.getByAltText('homework').getAttribute('src')).toBe('blob:http://localhost/1')
  })
})
