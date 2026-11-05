import { wrap } from './newclassStyles'

export function NewClassFooter() {
  return (
    <footer className="border-t border-nc-footer-line bg-nc-peach py-10 text-nc-ink-2">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 text-[15px]`}>
        <b className="font-nc-display text-nc-ink">הכיתה החדשה 3D</b>
        <span>תלמיד שלומד בעצמו, מורה עם זמן ללמד.</span>
        <span>[מייל] · [טלפון]</span>
      </div>
    </footer>
  )
}
