// The three-faced cube: top = student, left = teacher, right = class.

interface CubeFacesProps {
  stroke: number
  scale: number
}

function CubeFaces({ stroke, scale }: CubeFacesProps) {
  const face = { strokeWidth: stroke, strokeLinejoin: 'round' as const }
  return (
    <>
      <polygon
        points="0,-100 86.6,-50 0,0 -86.6,-50"
        className="fill-nc-student stroke-nc-student"
        {...face}
        transform={`translate(0,-50) scale(${scale}) translate(0,50)`}
      />
      <polygon
        points="-86.6,-50 0,0 0,100 -86.6,50"
        className="fill-nc-teacher stroke-nc-teacher"
        {...face}
        transform={`translate(-43.3,25) scale(${scale}) translate(43.3,-25)`}
      />
      <polygon
        points="0,0 86.6,-50 86.6,50 0,100"
        className="fill-nc-class stroke-nc-class"
        {...face}
        transform={`translate(43.3,25) scale(${scale}) translate(-43.3,-25)`}
      />
    </>
  )
}

export function CubeLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-110 -110 220 220" aria-hidden="true">
      <CubeFaces stroke={18} scale={0.86} />
    </svg>
  )
}

export function HeroCube() {
  const label = 'font-nc-display fill-white text-[12px] font-bold'
  return (
    <svg
      viewBox="-125 -125 250 250"
      role="img"
      aria-label="קובייה בשלושה ממדים: התלמיד, המורה והכיתה"
      className="h-auto w-full max-w-[380px]"
    >
      <ellipse cx="0" cy="118" rx="80" ry="8" className="fill-nc-ink/20" />
      <CubeFaces stroke={16} scale={0.9} />
      <g
        fill="none"
        className="stroke-white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M-6,-44 a12,12 0 1 1 12,0 v5 h-12 z" />
        <path d="M-4,-34 h8" />
        <path d="M0,-72 v-5 M16,-66 l3,-3 M-16,-66 l-3,-3" />
        <circle cx="-43" cy="14" r="7" />
        <path d="M-56,40 a13,13 0 0 1 26,0" />
        <path d="M-31,10 l12,-10" />
        <circle cx="43" cy="26" r="15" />
        <path d="M43,17 v9 l7,5" />
      </g>
      <text x="0" y="-18" textAnchor="middle" className={label}>
        התלמיד
      </text>
      <text x="-43" y="60" textAnchor="middle" className={label}>
        המורה
      </text>
      <text x="43" y="60" textAnchor="middle" className={label}>
        הכיתה
      </text>
    </svg>
  )
}
