Fixed two medium-priority review items on PR #171 (159--start-html):

1. Design system gradients: Added 11 new --gradient-* CSS variables to globals.css (light theme block) and a matching gradient export to tailwind.tokens.mjs. Replaced all hardcoded linear-gradient strings in NewStartPage/index.tsx with var(--gradient-*) references.

2. SEO metadata: Restored generateMetadata() export in page.tsx using pageMetadata() helper, with bilingual Hebrew/English title and description for /start.

Both changes verified — pnpm ci:local passes.
