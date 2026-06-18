Fixed two files that still contained unresolved merge conflict markers (<<<<<<< HEAD, =======, >>>>>>> origin/dev) inside their @ai-summary JSDoc blocks.

- `support-generation-prompt-builder.ts`: merged HEAD's emphasis on @ts-nocheck and dynamic block properties with origin/dev's warning about manual sync requirements and prompt format compatibility.
- `support-generation-service.ts`: merged HEAD's server-side-only guarantee with origin/dev's pedagogical explanation that "solution" is a guiding question, plus the retry-on-missing-fields behavior.

Quality gates: `pnpm typecheck` and `pnpm lint` both pass.
