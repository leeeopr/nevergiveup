'use client'

import { useEffect, useState } from 'react'
import { animate } from 'motion/react'

interface CounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}

export function Counter({ value, duration = 1.5, prefix = '', suffix = '', decimals = 0 }: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      onUpdate: (latest) => setDisplayValue(latest),
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [value, duration])

  const formatted = displayValue.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className="tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  )
}
