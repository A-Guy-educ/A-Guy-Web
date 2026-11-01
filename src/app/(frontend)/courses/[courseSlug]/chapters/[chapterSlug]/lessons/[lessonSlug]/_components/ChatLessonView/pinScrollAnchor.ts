/**
 * How long a freshly emitted intro/section stays pinned to the top of the
 * viewport while its lazy images and JSXGraph boards finish laying out.
 */
const SETTLE_MS = 1500

const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const

/**
 * Scrolls `anchor` to the top of the viewport and keeps it there while the
 * content around it settles.
 *
 * A single `scrollIntoView` isn't enough here: the new section mounts before
 * its images / sketches have a size, so the page is too short and the scroll
 * clamps at the bottom; then the content grows and the browser's scroll
 * anchoring carries the viewport along with it — landing the student at the
 * END of the section instead of its first block. Re-pinning on every resize
 * of `content` for a short window fixes both. Any user scroll input releases
 * the pin immediately so we never fight the student.
 *
 * Returns a cleanup that releases the pin.
 */
export function pinScrollAnchor(
  anchor: Element,
  content: Element | null,
  scroller: HTMLElement | null,
): () => void {
  const scrollToAnchor = () => anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
  scrollToAnchor()
  if (!content || !scroller || typeof ResizeObserver === 'undefined') return () => {}

  const observer = new ResizeObserver(scrollToAnchor)
  let timer: ReturnType<typeof setTimeout> | undefined
  const release = () => {
    observer.disconnect()
    clearTimeout(timer)
    for (const type of USER_SCROLL_EVENTS) scroller.removeEventListener(type, release)
  }
  observer.observe(content)
  timer = setTimeout(release, SETTLE_MS)
  for (const type of USER_SCROLL_EVENTS) {
    scroller.addEventListener(type, release, { passive: true })
  }
  return release
}
