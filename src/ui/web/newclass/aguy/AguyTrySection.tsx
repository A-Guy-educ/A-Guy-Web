import { eyebrow, h2, lead, section, wrap } from '../newclassStyles'
import { DemoChat } from './DemoChat'

export function AguyTrySection() {
  return (
    <section id="try" className={`${section} bg-nc-paper`}>
      <div className={`${wrap} flex flex-wrap items-start gap-12`}>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <span className={eyebrow}>נסו את A-guy</span>
          <h2 className={h2}>לא עוד צ&apos;אט בוט שעונה במקום התלמיד</h2>
          <p className={lead}>
            צ&apos;אט בוט רגיל נותן את התשובה, והתלמיד ממשיך הלאה בלי להבין. A-guy שואל, מכוון ומחכה
            שהתלמיד יגיע לפתרון בעצמו. בחרו שאלה ותראו איך זה נראה.
          </p>
        </div>
        <DemoChat />
      </div>
    </section>
  )
}
