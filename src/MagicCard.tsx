import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
} from 'motion/react'

type MagicCardProps = {
  children: ReactNode
  className?: string
  gradientSize?: number
  gradientFrom?: string
  gradientTo?: string
  gradientColor?: string
}

/** Magic UI Magic Card — spotlight border without next-themes */
export function MagicCard({
  children,
  className = '',
  gradientSize = 220,
  gradientFrom = 'var(--accent)',
  gradientTo = 'transparent',
  gradientColor = 'rgba(255,255,255,0.06)',
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)
  const sizeRef = useRef(gradientSize)

  useEffect(() => {
    sizeRef.current = gradientSize
  }, [gradientSize])

  const reset = useCallback(() => {
    const off = -sizeRef.current
    mouseX.set(off)
    mouseY.set(off)
  }, [mouseX, mouseY])

  useEffect(() => {
    reset()
  }, [reset])

  const borderBg = useMotionTemplate`linear-gradient(var(--surface) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom},
      ${gradientTo},
      var(--line) 100%
    ) border-box`

  const glowBg = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
    ${gradientColor},
    transparent 70%
  )`

  return (
    <motion.div
      className={`magic-card ${className}`.trim()}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - rect.left)
        mouseY.set(e.clientY - rect.top)
      }}
      onPointerLeave={reset}
      style={{ background: borderBg }}
    >
      <motion.div className="magic-card-glow" style={{ background: glowBg }} />
      <div className="magic-card-body">{children}</div>
    </motion.div>
  )
}
