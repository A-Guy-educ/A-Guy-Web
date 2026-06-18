import {
  MessageCircle,
  Lightbulb,
  Check,
  BookOpen,
  Zap,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

export interface Feature {
  title: string
  desc: string
  gradient: string
  Icon: LucideIcon
  delay: number
}

export const FEATURES: readonly Feature[] = [
  {
    title: "צ'אט אינטראקטיבי",
    desc: 'שואל שאלות בכל רגע ומקבל הסברים מותאמים לרמה שלך. לא רק תשובות — גם הבנה.',
    gradient: 'var(--gradient-sky-blue)',
    Icon: MessageCircle,
    delay: 0,
  },
  {
    title: 'זיהוי פערי ידע',
    desc: 'המערכת מזהה בדיוק איפה אתה מתקשה ויוצר מסלול לימוד מותאם לסגור את הפערים.',
    gradient: 'var(--gradient-purple-indigo)',
    Icon: Lightbulb,
    delay: 100,
  },
  {
    title: 'תרגול ממוקד',
    desc: 'אלפי תרגילים עם משוב מיידי. לא רק אם טעית — אלא גם למה ואיך לתקן.',
    gradient: 'var(--gradient-green)',
    Icon: Check,
    delay: 200,
  },
  {
    title: 'מחברת אישית',
    desc: 'כל ההסברים, התרגילים וההתקדמות שלך נשמרים במקום אחד — נגיש תמיד.',
    gradient: 'var(--gradient-amber)',
    Icon: BookOpen,
    delay: 300,
  },
  {
    title: 'מהירות התקדמות',
    desc: 'לומדים 3x יותר מהר משיטות מסורתיות — בזכות התאמה אישית ותרגול ממוקד.',
    gradient: 'var(--gradient-pink)',
    Icon: Zap,
    delay: 400,
  },
  {
    title: 'מעקב התקדמות',
    desc: 'גרפים וסטטיסטיקות אישיות מראות בדיוק איפה אתה עומד ומה היעדים הבאים.',
    gradient: 'var(--gradient-indigo-purple-alt)',
    Icon: BarChart3,
    delay: 500,
  },
]

export const ONBOARDING_STEPS = [
  {
    q: 'איך A-Guy שונה ממורה פרטי?',
    a: 'A-Guy זמין 24/7, עונה מיידית, ולומד את דפוס הטעויות שלך כדי להתאים הסברים בדיוק לרמה שלך — בעלות של פיצה אחת בחודש.',
  },
  {
    q: 'איך מתחילים?',
    a: 'פשוט לוחצים על "התחל ניסיון חינם", בוחרים נושא, ומתחילים לשאול שאלות. אין צורך בהתקנה או ידע טכני.',
  },
  {
    q: 'האם המערכת בטוחה?',
    a: 'בהחלט! כל הנתונים מוצפנים, אנחנו לא שומרים מידע אישי, והמערכת עומדת בתקנות הגנת הפרטיות.',
  },
] as const
