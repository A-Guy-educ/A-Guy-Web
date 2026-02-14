# Spec: Minimal Version Number in Site Footer

## Overview

Add a minimal version number display to the public site footer, matching the admin page implementation.

## Admin Version Implementation (Reference)

- **Source:** `NEXT_PUBLIC_APP_VERSION` env var (falls back to 'dev')
- **Format:** `v${version}` (e.g., "v0.9.0")
- **Styling:** 12px font, color: `var(--theme-elevation-400)`
- **Display:** Shows version + build date

## Requirements

### Version Source

- Use same env var as admin: `NEXT_PUBLIC_APP_VERSION`
- Fallback to 'dev' if not available

### Location

- Add to the existing Footer component at `/src/ui/web/footer/Component.tsx`
- Position: Right side, aligned with nav items
- Alternative: Could be added near copyright area (but there's no copyright in current footer)

### Styling (Minimal/Subtle)

- Font size: 12px (same as admin)
- Color: Use a subtle muted color (e.g., `text-muted-foreground` or similar Tailwind token)
- Not bold - use normal font weight
- Small, unobtrusive

## Implementation Steps

1. Create or reuse VersionInfo component for frontend (or inline the version display)
2. Add version display to Footer component
3. Use same env var approach as admin

## Acceptance Criteria

- [ ] Version displays in public site footer
- [ ] Version is small and minimal (not bold)
- [ ] Uses same version source as admin page
- [ ] Matches or complements admin page styling
