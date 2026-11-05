import Link from 'next/link'

import { HeroCube } from '../CubeMark'
import { btn, wrap } from '../newclassStyles'

const heroGlow =
  'bg-[radial-gradient(560px_400px_at_18%_35%,hsl(var(--nc-brand)/0.28),transparent_70%),radial-gradient(360px_300px_at_30%_0%,hsl(var(--nc-student)/0.16),transparent_70%),radial-gradient(400px_320px_at_6%_90%,hsl(var(--nc-teacher)/0.2),transparent_70%)]'

export function HeroSection() {
  return (
    <section id="top" className={`bg-nc-sun ${heroGlow} pt-[88px] pb-24 text-nc-ink`}>
      <div className={`${wrap} flex flex-wrap items-center gap-14`}>
        <div className="flex min-w-0 flex-[999_1_500px] flex-col gap-6">
          <span className="self-start rounded-full border border-nc-brand-tint bg-nc-paper px-3.5 py-1.5 text-sm font-semibold text-nc-brand-deep">
            מתמטיקה לכיתות ז׳–י״ב · בתוך שעות בית הספר
          </span>
          <h1 className="font-nc-display text-[clamp(36px,5.2vw,64px)] font-extrabold leading-[1.14] text-balance">
            מורה אחד מול 40 תלמידים?
            <br />
            הגיע הזמן ל<span className="text-nc-brand">כיתה חדשה</span>.
          </h1>
          <p className="max-w-[600px] text-xl leading-[1.65] text-nc-ink-2">
            A-guy הוא לא עוד מורה AI שנכנס לכיתה ונשאר שם לבד. אנחנו מלווים את בית הספר בתהליך הטמעה
            מלא, עד שהכיתה עובדת אחרת: כל תלמיד מתקדם בקצב שלו, והמורה פנוי למי שבאמת צריך אותו.
            ולצידו, בני נוער מלומדים ללמד עובדים לצד המורה בכיתה.
          </p>
          <div className="flex flex-wrap gap-3 pt-1.5">
            <Link className={btn.brand} href="/newclass#programs">
              לתוכניות שלנו
            </Link>
            <Link className={btn.ghost} href="/newclass/aguy#implement">
              איך אנחנו מטמיעים
            </Link>
          </div>
          <p className="flex flex-wrap items-center gap-2.5 text-base text-nc-ink-2">
            החזון שלנו:{' '}
            <strong className="font-semibold text-nc-brand-deep">
              תלמיד שלומד בעצמו, מורה עם זמן ללמד.
            </strong>
          </p>
        </div>
        <div className="flex flex-[1_1_300px] justify-center">
          <HeroCube />
        </div>
      </div>
    </section>
  )
}
