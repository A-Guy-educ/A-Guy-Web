import type { ReactNode } from 'react'

// Pre-scripted A-guy demo conversations. Each step asks a question; a wrong
// pick gets the hint and the same options again, the right one moves on.

export interface DemoStep {
  ai: ReactNode
  options: string[]
  correct: string
  hint: ReactNode
}

export interface DemoScenario {
  question: string
  steps: DemoStep[]
  end: ReactNode
}

const Ltr = ({ children }: { children: ReactNode }) => (
  <span dir="ltr" className="inline-block [unicode-bidi:isolate]">
    {children}
  </span>
)

export const DEMO_GREETING =
  'היי, אני A-guy. אני לא פותר במקומך, אני עוזר לך לפתור בעצמך. במה נתחיל?'

export const DEMO_RESTART = 'שאלה אחרת'

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    question: 'מה השיפוע של הישר שעובר דרך (1,2) ו-(3,6)?',
    steps: [
      {
        ai: 'בוא נמצא את זה יחד. מ-x=1 ל-x=3, כמה יחידות התקדמנו ימינה?',
        options: ['2', '3', '4'],
        correct: '2',
        hint: 'כמעט. כמה זה 3 פחות 1?',
      },
      {
        ai: 'נכון! ובאותו זמן, בכמה עלה y, מ-2 ל-6?',
        options: ['4', '6', '8'],
        correct: '4',
        hint: 'נסה שוב: כמה זה 6 פחות 2?',
      },
      {
        ai: 'מצוין. על 2 צעדים ימינה הישר עלה 4. כמה הוא עולה על צעד אחד?',
        options: ['2', '4', '8'],
        correct: '2',
        hint: 'רמז: 4 חלקי 2 זה...?',
      },
    ],
    end: (
      <>
        בדיוק! השיפוע הוא 2, ומצאת אותו בעצמך. זה כל הרעיון: <Ltr>m = (6 − 2) ÷ (3 − 1) = 2</Ltr>
      </>
    ),
  },
  {
    question: 'פשוט תגיד לי מה התשובה',
    steps: [
      {
        ai: 'אני מבין, ככה יותר מהר. אבל אם אגיד לך, תדע לפתור רק את התרגיל הזה. אם נפתור יחד, תדע לפתור גם את הבא. ננסה צעד אחד?',
        options: ['טוב, ננסה', 'עדיין רוצה רק תשובה'],
        correct: 'טוב, ננסה',
        hint: 'בוא נעשה עסקה: צעד אחד ביחד. ואם עדיין תיתקע, תרים יד, והמורה יגיע אליך.',
      },
    ],
    end: 'מעולה. אז מתחילים כמו תמיד: מה ידוע לנו בשאלה? כתוב לי את הנתונים, ונמשיך משם.',
  },
  {
    question: 'לא הבנתי מה זה חזקה',
    steps: [
      {
        ai: (
          <>
            חזקה היא דרך קצרה לכתוב כפל של מספר בעצמו. למשל <Ltr>2³ = 2·2·2 = 8</Ltr>. נסה אתה: כמה
            זה <Ltr>3²</Ltr>?
          </>
        ),
        options: ['6', '9', '5'],
        correct: '9',
        hint: (
          <>
            <Ltr>3²</Ltr> זה 3 כפול 3. כמה זה?
          </>
        ),
      },
    ],
    end: (
      <>
        נכון! <Ltr>3·3 = 9</Ltr>. החזקה אומרת כמה פעמים כופלים את המספר בעצמו.
      </>
    ),
  },
]
