'use client'

/**
 * Thin divider + three vertical dots rendered where the student skipped
 * exercise sections via "דלג על תרגיל" (Task 8). The spec deliberately
 * does NOT reopen skipped sections — this marker is the only trace left
 * in the stream, giving the student a visual breadcrumb between what they
 * answered and the next exercise's intro. Purely presentational.
 *
 * The dashed line on either side of the dots prevents the triple-dot stack
 * from reading as a "loading" indicator — the horizontal rules make it
 * read as a break in content, matching how collapsed diff hunks render.
 */
export function SkippedMarker() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center gap-3 self-stretch py-3 text-muted-foreground/70"
    >
      <span className="h-px flex-1 border-t border-dashed border-border/60" />
      <span className="flex flex-col items-center gap-1">
        <span className="h-3 w-3 rounded-full border-2 border-current bg-transparent" />
        <span className="h-3 w-3 rounded-full border-2 border-current bg-transparent" />
        <span className="h-3 w-3 rounded-full border-2 border-current bg-transparent" />
      </span>
      <span className="h-px flex-1 border-t border-dashed border-border/60" />
    </div>
  )
}
