const ROWS = [98, 136, 174, 212, 250]
const COLS = [60, 100, 140, 180, 220, 260, 300, 340]
const svgFrame = 'h-auto w-full max-w-full rounded-2xl bg-nc-paper'

export function OldClassroomIllustration() {
  return (
    <svg
      viewBox="0 0 400 290"
      role="img"
      aria-label="כיתה רגילה: מורה ליד הלוח ו-40 תלמידים בשורות שפונים אליו"
      className={svgFrame}
    >
      <rect x="110" y="14" width="180" height="10" rx="3" className="fill-nc-old-board" />
      <text x="200" y="40" textAnchor="middle" className="fill-nc-old-ink text-[11px]">
        לוח
      </text>
      <circle cx="200" cy="58" r="10" className="fill-nc-old-ink" />
      <g className="fill-nc-old-seat">
        {ROWS.flatMap((y) => COLS.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="8" />))}
      </g>
      <g className="stroke-nc-old-seat" strokeWidth="1.5" strokeDasharray="3 4" fill="none">
        <path d="M200 70 L200 84" />
        <path d="M190 68 L120 86" />
        <path d="M210 68 L280 86" />
      </g>
    </svg>
  )
}

const SOLO = [55, 110, 165].flatMap((x) => [50, 95, 140].map((y) => ({ x, y })))
const PAIRS = [33, 88, 143]

export function NewClassroomIllustration() {
  return (
    <svg
      viewBox="0 0 400 290"
      role="img"
      aria-label="הכיתה החדשה: תלמידים לומדים לבד עם A-guy, תלמידים בזוגות, המורה עם קבוצה קטנה, וחונך מלומדים ללמד עם קבוצה נוספת"
      className={svgFrame}
    >
      <line x1="210" y1="20" x2="210" y2="272" className="stroke-nc-divider" strokeWidth="1.5" />
      <line x1="20" y1="190" x2="390" y2="190" className="stroke-nc-divider" strokeWidth="1.5" />
      <g className="fill-nc-ink-2 text-[12px] font-semibold" textAnchor="middle">
        <text x="110" y="28">
          לבד עם A-guy
        </text>
        <text x="110" y="210">
          בזוגות
        </text>
        <text x="300" y="28">
          קבוצה עם המורה
        </text>
        <text x="300" y="210">
          עם חונך
        </text>
      </g>
      {SOLO.map(({ x, y }) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="8" className="fill-nc-seat" />
          <rect x={x - 10} y={y + 11} width="20" height="11" rx="2" className="fill-nc-aguy" />
        </g>
      ))}
      {PAIRS.map((x) => (
        <g key={x}>
          <rect x={x} y="248" width="44" height="8" rx="3" className="fill-nc-desk" />
          <circle cx={x + 11} cy="238" r="8" className="fill-nc-seat" />
          <circle cx={x + 33} cy="238" r="8" className="fill-nc-seat" />
        </g>
      ))}
      <circle cx="300" cy="105" r="32" className="fill-nc-brand-tint" />
      <circle cx="300" cy="58" r="11" className="fill-nc-brand" />
      <g className="fill-nc-seat">
        <circle cx="262" cy="105" r="8" />
        <circle cx="338" cy="105" r="8" />
        <circle cx="280" cy="140" r="8" />
        <circle cx="320" cy="140" r="8" />
      </g>
      <circle cx="300" cy="252" r="22" className="fill-nc-student-tint" />
      <circle cx="300" cy="226" r="10" className="fill-nc-student" />
      <g className="fill-nc-seat">
        <circle cx="270" cy="258" r="8" />
        <circle cx="330" cy="258" r="8" />
      </g>
    </svg>
  )
}
