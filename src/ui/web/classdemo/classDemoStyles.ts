// Shared Tailwind class strings for the /classdemo walkthrough. Colors come from
// the `nc-*` palette (src/app/(frontend)/newclass-tokens.css), like /newclass.

export const wrap = 'mx-auto w-full max-w-[1180px] px-4 sm:px-7'

export const panel = 'rounded-2xl border border-nc-line bg-nc-paper'

export const eyebrow =
  "inline-flex items-center gap-content-gap-xs text-[13px] font-extrabold text-nc-brand before:size-2 before:rounded-full before:bg-nc-brand-light before:content-['']"

export const counter =
  'whitespace-nowrap rounded-[10px] bg-nc-brand-tint px-3 py-1.5 text-body-xs font-extrabold text-nc-brand-deep'

export const chip =
  'inline-flex items-center gap-content-gap-xs rounded-[10px] border border-nc-line bg-nc-paper px-3 py-2 text-body-xs font-bold text-nc-ink-2'

const btnBase =
  'inline-flex cursor-pointer items-center justify-center gap-content-gap-xs whitespace-nowrap rounded-xl border font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nc-brand-light disabled:cursor-default disabled:opacity-70'

const md = 'px-[18px] py-[11px] text-body-sm'
const sm = 'rounded-[10px] px-3 py-2 text-body-xs'

export const btn = {
  primary: `${btnBase} ${md} border-transparent bg-nc-brand text-white hover:bg-nc-brand-deep`,
  outline: `${btnBase} ${md} border-nc-ghost-line bg-nc-paper text-nc-ink hover:border-nc-brand`,
  primarySm: `${btnBase} ${sm} border-transparent bg-nc-brand text-white hover:bg-nc-brand-deep`,
  outlineSm: `${btnBase} ${sm} border-nc-ghost-line bg-nc-paper text-nc-ink hover:border-nc-brand`,
  ghostSm: `${btnBase} ${sm} border-transparent bg-transparent text-nc-ink-2 hover:bg-nc-ground`,
}
