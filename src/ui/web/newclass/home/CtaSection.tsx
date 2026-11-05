import { ContactButton } from '../contact/ContactButton'
import { btn, wrap } from '../newclassStyles'

export function CtaSection() {
  return (
    <section className="bg-nc-paper pb-24">
      <div className={wrap}>
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-nc-brand-deep bg-[radial-gradient(420px_280px_at_10%_120%,hsl(var(--nc-brand-light)/0.55),transparent_70%)] px-6 py-10 text-white sm:px-10 sm:py-14">
          <div>
            <h2 className="font-nc-display text-[clamp(26px,3vw,36px)] font-extrabold">
              רוצים את הכיתה החדשה אצלכם?
            </h2>
            <p className="mt-2 text-lg text-nc-brand-on">
              מנהלים, מורים והורים: השאירו פרטים ונחזור אליכם.
            </p>
          </div>
          <ContactButton className={btn.light}>השאירו פרטים</ContactButton>
        </div>
      </div>
    </section>
  )
}
