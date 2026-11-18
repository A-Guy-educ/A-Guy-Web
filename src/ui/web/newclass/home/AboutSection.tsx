import { eyebrow, h2, lead, section, wrap } from '../newclassStyles'

const TEAM = [
  { name: '[שם]', bio: '[תפקיד ורקע קצר]' },
  { name: '[שם]', bio: '[תפקיד ורקע קצר]' },
]

export function AboutSection() {
  return (
    <section id="about" className={`${section} bg-nc-paper`}>
      <div className={`${wrap} flex flex-wrap items-start gap-14`}>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-content-gap">
          <span className={eyebrow}>קצת עלינו</span>
          <h2 className={h2}>אנשי חינוך שרוצים כיתה אחרת</h2>
          <p className={lead}>
            [הסיפור שלכם: איך התחיל הפרויקט, מה ראיתם בכיתות, ולמה החלטתם לבנות את הכיתה החדשה]
          </p>
        </div>
        <div className="grid min-w-0 flex-[1_1_460px] grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-content-gap">
          {TEAM.map((person, i) => (
            <div
              key={i}
              className="flex flex-col gap-content-gap-xs rounded-[20px] bg-nc-ground p-card-padding"
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-nc-line text-body-xs text-nc-ink-2">
                [תמונה]
              </div>
              <strong>{person.name}</strong>
              <span className="text-[15px] text-nc-ink-2">{person.bio}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
