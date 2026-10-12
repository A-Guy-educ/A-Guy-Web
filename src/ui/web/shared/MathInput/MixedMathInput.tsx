/**
 * MixedMathInput — WYSIWYG chat/answer input where prose uses the browser's
 * native contenteditable (and the OS's own keyboard on mobile) and formulas
 * live as atomic KaTeX-rendered chips that expand into a math editor on click.
 *
 * The chip model is the "words formulas, moved and edited, keep structure"
 * mental model — one backspace deletes a whole chip; drag-reorder works via
 * ProseMirror's native inline-node handling.
 *
 * Wire format stays markdown with inline `$...$` math; `tiptapMarkdown.ts`
 * handles the round-trip to TipTap's JSON document shape.
 */

'use client'

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { cn } from '@/infra/utils/ui'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { MathInline } from './MathInlineNode'
import { MATH_INLINE_NODE, markdownToTipTap, tipTapToMarkdown } from './tiptapMarkdown'

export interface MixedMathInputProps {
  value: string
  onChange: (markdown: string) => void
  onEnterKey?: () => void
  /** Called once the editor is mounted. The HTMLElement is the contenteditable
   *  DOM node — handy for parent code that wants to call `.focus()` on it. */
  onReady?: (contentDOM: HTMLElement) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export interface MixedMathInputRef {
  focus: () => void
  insert: (latex: string) => void
}

export const MixedMathInput = forwardRef<MixedMathInputRef, MixedMathInputProps>(
  function MixedMathInput(
    { value, onChange, onEnterKey, onReady, disabled = false, placeholder, className },
    ref,
  ) {
    const handlers = useRef({ onChange, onEnterKey, onReady })
    handlers.current = { onChange, onEnterKey, onReady }
    const lastMarkdown = useRef(value)

    const extensions = useMemo(
      () => [
        // Disable rich-text marks/nodes we don't want students to produce in
        // a chat/answer field. Keep paragraph + text + hard-break + history.
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          code: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          horizontalRule: false,
          bold: false,
          italic: false,
          strike: false,
          link: false,
          underline: false,
          dropcursor: false,
          gapcursor: false,
        }),
        MathInline,
        Placeholder.configure({ placeholder: placeholder ?? '' }),
      ],
      [placeholder],
    )

    const editor = useEditor({
      extensions,
      content: markdownToTipTap(value),
      editable: !disabled,
      // Avoid Next.js hydration mismatch when the editor mounts client-side.
      immediatelyRender: false,
      onCreate: ({ editor }) => {
        handlers.current.onReady?.(editor.view.dom as HTMLElement)
      },
      onUpdate: ({ editor }) => {
        const next = tipTapToMarkdown(editor.getJSON())
        if (lastMarkdown.current !== next) {
          lastMarkdown.current = next
          handlers.current.onChange(next)
        }
      },
      editorProps: {
        handleKeyDown: (_view, event) => {
          if (event.key === 'Enter' && !event.shiftKey && handlers.current.onEnterKey) {
            event.preventDefault()
            handlers.current.onEnterKey()
            return true
          }
          return false
        },
      },
    })

    const insert = useCallback(
      (latex: string) => {
        if (!editor) return
        editor.chain().focus().insertContent({ type: MATH_INLINE_NODE, attrs: { latex } }).run()
      },
      [editor],
    )

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus(),
        insert,
      }),
      [editor, insert],
    )

    // Sync external value changes (e.g. parent resets after submit).
    useEffect(() => {
      if (!editor) return
      if (lastMarkdown.current === value) return
      lastMarkdown.current = value
      editor.commands.setContent(markdownToTipTap(value), { emitUpdate: false })
    }, [value, editor])

    useEffect(() => {
      editor?.setEditable(!disabled)
    }, [disabled, editor])

    return (
      <EditorContent
        editor={editor as Editor | null}
        className={cn('mixed-math-input', disabled && 'opacity-60 pointer-events-none', className)}
      />
    )
  },
)
