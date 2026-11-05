// Shared Tailwind class strings for the /newclass landing ("The New Classroom 3D").
// Colors come from the `nc-*` palette (src/app/(frontend)/newclass-tokens.css).

export const wrap = 'mx-auto w-full max-w-[1200px] px-6'

export const section = 'scroll-mt-20 py-24'

export const viewSection = 'scroll-mt-20 py-[72px]'

export const eyebrow = 'font-nc-display text-[15px] font-bold tracking-[.4px] text-nc-brand-deep'

export const h2 =
  'font-nc-display text-[clamp(30px,3.6vw,44px)] font-extrabold leading-[1.2] text-balance'

export const viewH2 = 'mb-6 font-nc-display text-[clamp(26px,3vw,36px)] font-extrabold'

export const lead = 'text-lg leading-[1.75] text-nc-ink-2'

const btnBase =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-6 py-[13px] text-base font-semibold no-underline transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nc-brand-light'

export const btn = {
  brand: `${btnBase} bg-nc-brand text-white hover:bg-nc-brand-deep`,
  ghost: `${btnBase} border border-nc-ghost-line bg-nc-paper text-nc-ink hover:border-nc-brand`,
  teacher: `${btnBase} bg-nc-teacher text-white hover:bg-nc-teacher-deep`,
  student: `${btnBase} bg-nc-student-deep text-white hover:bg-nc-student`,
  light: `${btnBase} bg-white text-[17px] font-bold text-nc-brand-deep hover:bg-nc-brand-tint`,
}

export const card = 'rounded-[20px] bg-nc-paper'

export const tag = 'rounded-full px-3.5 py-1.5 text-sm font-semibold'
