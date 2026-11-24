/**
 * @fileType component
 * @domain marketing
 * @ai-summary The two pill tags shared by the team card and profile dialog:
 * the mono "code" tag (LTR) and the role tag.
 */

export function TeamCodeTag({ code }: { code: string }) {
  return (
    <span
      dir="ltr"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-body-2xs tracking-wider text-primary-text"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
      {code}
    </span>
  )
}

export function TeamRoleTag({ role }: { role: string }) {
  return (
    <span className="inline-block rounded-full border border-accent/20 bg-accent/10 px-3 py-0.5 text-body-xs font-medium text-accent">
      {role}
    </span>
  )
}
