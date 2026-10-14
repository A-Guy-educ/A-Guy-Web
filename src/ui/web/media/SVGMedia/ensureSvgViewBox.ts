/**
 * @fileType utility
 * @domain ui
 * @pattern svg-normalization
 * @ai-summary Adds a viewBox to an SVG when the author omitted one, so the SVG scales predictably inside responsive containers.
 */

/**
 * Inject a `viewBox` into an SVG root tag when one is missing.
 *
 * WHY: Author-uploaded SVGs frequently declare only `width` / `height` and
 * omit `viewBox`. When such an SVG is rendered inside a container that forces
 * a different display size (e.g. Next.js `<Image>` with declared dimensions
 * plus `max-w-full h-auto`), browsers have no rule for mapping the SVG's
 * internal coordinates into the resized box — text and shapes drift out of
 * position. Deriving a viewBox from the intrinsic width/height makes the SVG
 * scale as a coherent unit at any display size.
 *
 * Behaviour:
 *  - No `<svg>` tag found → returned unchanged.
 *  - Root tag already has a `viewBox` → returned unchanged.
 *  - `width` or `height` missing / non-numeric → returned unchanged (nothing
 *    we can safely infer).
 *  - Otherwise → returns the SVG with `viewBox="0 0 <width> <height>"`
 *    inserted onto the root tag.
 *
 * The function is intentionally string-based (regex on the root tag) rather
 * than DOM-based so it runs on the server and does not depend on `window`.
 */
export function ensureSvgViewBox(svg: string): string {
  // Match every <svg …> opening tag while stepping over quoted attribute
  // values that may themselves contain `>`. A naive `[^>]*` would truncate on
  // the first `>` inside e.g. `data-note="a>b"` and miss width / height.
  //
  // The `g` flag matters: Admin occasionally stores two sibling `<svg>` blocks
  // in a single field (a known upstream duplicate-save bug). Patching only
  // the first opener left the second SVG at its raw `width="480"` intrinsic
  // size while the first scaled to 100% — producing the "top row normal,
  // bottom row shrunken" artifact in the scroll view.
  const openTagRegex = /<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi
  const openTags = svg.match(openTagRegex)
  if (!openTags) return svg

  let result = svg
  for (const openTag of openTags) {
    if (/\bviewBox\s*=/i.test(openTag)) continue

    // Anchor the digit run to the end of the attribute value so `width="100%"`,
    // `width="1e3"`, and other unit-suffixed / scientific-notation values fall
    // through to the unchanged branch rather than silently producing a
    // truncated viewBox (e.g. `100` from `100%`).
    const width = openTag.match(/\bwidth\s*=\s*["']?([\d.]+)(?=["'\s/>])/i)?.[1]
    const height = openTag.match(/\bheight\s*=\s*["']?([\d.]+)(?=["'\s/>])/i)?.[1]
    if (!width || !height) continue

    const patchedTag = openTag.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}"`)
    // Replace exactly the match we're on — `.replace(string, string)` only
    // affects the first occurrence, which is correct here even for duplicate
    // identical openers because we patch left-to-right and each replacement
    // shrinks the remaining-to-match substring by one.
    result = result.replace(openTag, patchedTag)
  }

  return result
}
