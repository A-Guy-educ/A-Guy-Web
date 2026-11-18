import { ContactButton } from '../contact/ContactButton'
import { btn, section, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'

const STEPS = [
  {
    title: 'היכרות',
    us: 'מכירים את הכיתות, בונים תוכנית ומכינים הכול מראש.',
    teacher: 'מספר לנו מה חשוב לו בכיתה.',
  },
  {
    title: 'הכנה',
    us: 'מגדירים את הכיתה במערכת, ומראים איך זה עובד.',
    teacher: 'מכיר את המערכת, בלי לחץ.',
  },
  {
    title: 'בכיתה',
    us: 'נמצאים בשיעורים הראשונים ועוזרים לתלמידים להתחיל.',
    teacher: 'מלמד, ואנחנו לצדו.',
  },
  {
    title: 'מעקב',
    us: 'עוקבים אחרי ההתקדמות ומציעים מה לשפר.',
    teacher: 'אומר לנו מה עובד ומה לא.',
  },
]

const roleBox = 'flex flex-col gap-1 rounded-xl p-3.5 text-[15px] leading-[1.6]'
const roleLabel = 'text-[13px] font-bold'

export function ImplementationProcess() {
  return (
    <section id="implement" className={`${section} bg-nc-ground`}>
      <div className={wrap}>
        <SectionHead kicker="תהליך ההטמעה של A-guy" title="המורה לא עושה את זה לבד">
          המורה ממשיך ללמד. את רוב העבודה סביב ההטמעה אנחנו לוקחים עלינו, ומתחילים בקטן, בקצב שמתאים
          לו.
        </SectionHead>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-content-gap">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-[20px] bg-nc-paper p-5">
              <span className="flex size-9 items-center justify-center rounded-full bg-nc-brand font-nc-display text-body-md font-extrabold text-white">
                {i + 1}
              </span>
              <h3 className="font-nc-display text-heading-xl font-bold">{step.title}</h3>
              <div className={`${roleBox} bg-nc-brand-tint`}>
                <span className={`${roleLabel} text-nc-brand-deep`}>אנחנו</span>
                {step.us}
              </div>
              <div className={`${roleBox} bg-nc-ground`}>
                <span className={`${roleLabel} text-nc-teacher-deep`}>המורה</span>
                {step.teacher}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-content-gap rounded-[20px] bg-nc-brand-tint px-6 py-5">
          <p className="font-nc-display text-body-lg font-bold text-nc-brand-deep">
            רוצים לשמוע איך זה ייראה אצלכם?
          </p>
          <ContactButton className={btn.brand} topic="Aguy לבית הספר">
            נשמח לספר
          </ContactButton>
        </div>
      </div>
    </section>
  )
}
