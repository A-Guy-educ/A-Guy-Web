'use client'

import { useEffect, useRef } from 'react'

import { useDemoChat } from './useDemoChat'

const bubble =
  'max-w-[86%] rounded-2xl px-3.5 py-2.5 text-base leading-[1.6] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5'

export function DemoChat() {
  const { messages, options, isStart, typing } = useDemoChat()
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, typing])

  return (
    <div
      id="demo"
      className="flex min-w-0 flex-[1_1_460px] flex-col gap-3 rounded-3xl border border-nc-line bg-nc-ground p-4"
    >
      <div className="flex items-center gap-2.5 border-b border-nc-line px-1.5 pt-1 pb-2.5">
        <span
          aria-hidden="true"
          className="flex size-9 flex-none items-center justify-center rounded-full bg-nc-aguy font-nc-display text-[15px] font-extrabold text-white"
        >
          A
        </span>
        <div>
          <div className="text-[15px] leading-[1.3] font-bold">A-guy</div>
          <div className="text-[13px] text-nc-ink-2">המורה הדיגיטלי · שיחה לדוגמה</div>
        </div>
      </div>
      <div
        ref={logRef}
        aria-live="polite"
        className="flex max-h-[460px] min-h-[300px] flex-col gap-2.5 overflow-y-auto px-0.5 py-1"
      >
        {messages.map((m) =>
          m.from === 'ai' ? (
            <div
              key={m.id}
              className={`${bubble} self-start rounded-br-[4px] border border-nc-line bg-nc-paper`}
            >
              {m.content}
            </div>
          ) : (
            <div
              key={m.id}
              className={`${bubble} self-end rounded-bl-[4px] bg-nc-brand text-white`}
            >
              {m.content}
            </div>
          ),
        )}
        {typing ? (
          <div
            aria-label="A-guy מקליד"
            className="flex gap-[5px] self-start rounded-2xl border border-nc-line bg-nc-paper px-4 py-3"
          >
            {[0, 150, 300].map((delay) => (
              <i
                key={delay}
                className="size-[7px] animate-pulse rounded-full bg-nc-ink-soft motion-reduce:animate-none"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {isStart ? <span className="w-full text-[13px] text-nc-ink-2">בחרו שאלה:</span> : null}
        {options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={opt.onPick}
            className="min-h-11 cursor-pointer rounded-full border border-nc-brand bg-nc-paper px-4 py-2 text-start text-[15px] font-medium text-nc-brand-deep hover:bg-nc-brand-tint"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="text-[13px] text-nc-ink-2">
        שיחה מוכנה מראש להמחשה. במוצר עצמו התלמיד כותב או מדבר בחופשיות.
      </div>
    </div>
  )
}
