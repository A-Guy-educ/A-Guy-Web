import { eyebrow, h2, lead, section, wrap } from '../newclassStyles'
import { ChatWindow, StudentWindow, TeacherWindow } from './ShowcaseWindows'

const STATS = [
  { value: '1000+', label: 'שיעורים', color: 'text-nc-student' },
  { value: 'ז׳–י״ב', label: 'כל החומר במתמטיקה', color: 'text-nc-teacher' },
  { value: 'כל מסך', label: 'בדפדפן, במחשב ובטלפון', color: 'text-nc-class-deep' },
]

export function AguyShowcase() {
  return (
    <section id="aguy" className={`${section} overflow-hidden bg-nc-peach`}>
      <div className={`${wrap} flex flex-wrap items-center gap-14`}>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
          <span className={eyebrow}>הכירו את A-guy</span>
          <h2 className={h2}>מורה דיגיטלי לכל תלמיד, ותמונת כיתה מלאה למורה</h2>
          <p className={lead}>
            A-guy הוא מורה דיגיטלי מבוסס בינה מלאכותית, אבל הוא לא צ&apos;אט בוט שנותן תשובות. הוא
            מסביר, שואל ומתרגל עם התלמיד צעד אחר צעד, בטקסט ובקול. כשהתלמיד צריך יותר, הוא פשוט מרים
            יד, והמורה כבר יודע מי זקוק לו.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-0.5 rounded-2xl bg-nc-paper px-3.5 py-[18px] shadow-elevation-3"
              >
                <b
                  className={`font-nc-display text-[21px] font-extrabold sm:text-[26px] ${s.color}`}
                >
                  {s.value}
                </b>
                <span className="text-sm leading-[1.4] text-nc-ink-2">{s.label}</span>
              </div>
            ))}
          </div>
          <ul className="flex flex-col gap-3.5 text-nc-ink-2">
            <li className="flex gap-3">
              <span className="mt-[9px] size-2.5 flex-none rounded-full bg-nc-student" />
              <span>
                <strong className="text-nc-ink">לתלמיד:</strong> שיעורים לפי נושאים, רמות ושאלוני
                הבגרות, עם תרגילים, בחינות ומעקב התקדמות אישי.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-[9px] size-2.5 flex-none rounded-full bg-nc-teacher" />
              <span>
                <strong className="text-nc-ink">למורה:</strong> דשבורד כיתתי עם ציון, זמן למידה ו
                <strong className="text-nc-ink">מדד עצמאות</strong> לכל תלמיד בכל שיעור.
              </span>
            </li>
          </ul>
        </div>
        <div
          role="img"
          aria-label="המחשה של A-guy: מסך תרגול, המורה הדיגיטלי מסביר פתרון, ודשבורד המורה"
          className="relative flex min-w-0 flex-[1_1_520px] flex-col gap-6 py-2 sm:block sm:h-[700px] sm:py-0"
        >
          <StudentWindow className="z-[2] rotate-[1.5deg] sm:top-0 sm:right-0 sm:w-[54%] sm:min-w-[240px] sm:rotate-[4deg]" />
          <ChatWindow className="z-[3] -rotate-[1.5deg] sm:top-10 sm:left-0 sm:w-1/2 sm:min-w-[240px] sm:-rotate-[5deg]" />
          <TeacherWindow className="z-[1] sm:top-[380px] sm:right-[4%] sm:w-[60%] sm:min-w-[250px] sm:-rotate-2" />
          <div className="z-[3] flex flex-col items-center gap-2 self-center sm:absolute sm:bottom-0 sm:left-1/2 sm:-translate-x-1/2">
            <div
              dir="ltr"
              className="flex size-[104px] items-center justify-center rounded-full bg-nc-aguy font-nc-display text-xl font-extrabold text-white shadow-[0_0_0_10px_hsl(var(--nc-aguy)/0.15)]"
            >
              A-guy
            </div>
            <small className="text-xs text-nc-ink-2">תצוגת המחשה</small>
          </div>
        </div>
      </div>
    </section>
  )
}
