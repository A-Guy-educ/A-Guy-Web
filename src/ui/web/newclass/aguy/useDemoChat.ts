'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { DEMO_GREETING, DEMO_RESTART, DEMO_SCENARIOS, type DemoScenario } from './demoChatScript'

const TYPING_MS = 850

export interface DemoMessage {
  id: number
  from: 'ai' | 'me'
  content: ReactNode
}

export interface DemoOption {
  label: string
  onPick: () => void
}

interface DemoOptions {
  items: DemoOption[]
  isStart: boolean
}

export function useDemoChat() {
  const [messages, setMessages] = useState<DemoMessage[]>([
    { id: 0, from: 'ai', content: DEMO_GREETING },
  ])
  const [options, setOptions] = useState<DemoOptions>({ items: [], isStart: false })
  const [typing, setTyping] = useState(false)
  const nextId = useRef(1)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // The engine only touches state setters and refs, so it is built once.
  const engine = useMemo(() => {
    const add = (from: DemoMessage['from'], content: ReactNode) => {
      const id = nextId.current++
      setMessages((prev) => [...prev, { id, from, content }])
    }

    const offer = (items: DemoOption[], isStart = false) => setOptions({ items, isStart })

    const say = (content: ReactNode, then: () => void) => {
      offer([])
      const finish = () => {
        setTyping(false)
        add('ai', content)
        then()
      }
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return finish()
      setTyping(true)
      timers.current.push(setTimeout(finish, TYPING_MS))
    }

    const runStep = (scenario: DemoScenario, index: number): void => {
      if (index >= scenario.steps.length) {
        say(scenario.end, () => offer([{ label: DEMO_RESTART, onPick: showStart }]))
        return
      }
      const step = scenario.steps[index]
      const ask = () =>
        offer(
          step.options.map((label) => ({
            label,
            onPick: () => {
              add('me', label)
              if (label === step.correct) runStep(scenario, index + 1)
              else say(step.hint, ask)
            },
          })),
        )
      say(step.ai, ask)
    }

    function showStart() {
      offer(
        DEMO_SCENARIOS.map((scenario) => ({
          label: scenario.question,
          onPick: () => {
            add('me', scenario.question)
            runStep(scenario, 0)
          },
        })),
        true,
      )
    }

    return { showStart }
  }, [])

  useEffect(() => {
    const pending = timers.current
    engine.showStart()
    return () => pending.forEach(clearTimeout)
  }, [engine])

  return { messages, options: options.items, isStart: options.isStart, typing }
}
