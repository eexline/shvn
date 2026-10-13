import type { CSSProperties, HTMLAttributes } from 'react'

type ShineBorderProps = HTMLAttributes<HTMLDivElement> & {
  borderWidth?: number
  duration?: number
  shineColor?: string | string[]
}

/** Magic UI Shine Border — animated edge highlight */
export function ShineBorder({
  borderWidth = 1,
  duration = 12,
  shineColor = '#ffffff',
  className = '',
  style,
  ...props
}: ShineBorderProps) {
  const colors = Array.isArray(shineColor) ? shineColor.join(',') : shineColor

  return (
    <div
      aria-hidden
      className={`shine-border ${className}`.trim()}
      style={
        {
          '--border-width': `${borderWidth}px`,
          '--duration': `${duration}s`,
          backgroundImage: `radial-gradient(transparent, transparent, ${colors}, transparent, transparent)`,
          backgroundSize: '300% 300%',
          padding: 'var(--border-width)',
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  )
}
