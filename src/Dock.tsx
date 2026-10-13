import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'

const DEFAULT_SIZE = 40
const DEFAULT_MAGNIFICATION = 48
const DEFAULT_DISTANCE = 100

function useDockMagnify() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const phone = window.matchMedia('(max-width: 899px)')
    const sync = () => setEnabled(fine.matches && phone.matches)
    sync()
    fine.addEventListener('change', sync)
    phone.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      phone.removeEventListener('change', sync)
    }
  }, [])

  return enabled
}

export type DockProps = {
  children: ReactNode
  className?: string
  iconSize?: number
  iconMagnification?: number
  iconDistance?: number
  disableMagnification?: boolean
}

export const Dock = forwardRef<HTMLDivElement, DockProps>(function Dock(
  {
    children,
    className = '',
    iconSize = DEFAULT_SIZE,
    iconMagnification = DEFAULT_MAGNIFICATION,
    iconDistance = DEFAULT_DISTANCE,
    disableMagnification,
  },
  ref,
) {
  const mouseX = useMotionValue(Infinity)
  const canMagnify = useDockMagnify()
  const noZoom = disableMagnification ?? !canMagnify

  const rendered = Children.map(children, (child) => {
    if (!isValidElement(child) || child.type !== DockIcon) return child
    return cloneElement(child as ReactElement<DockIconProps>, {
      mouseX,
      size: iconSize,
      magnification: iconMagnification,
      distance: iconDistance,
      disableMagnification: noZoom,
    })
  })

  return (
    <motion.div
      ref={ref}
      className={`dock ${className}`.trim()}
      onMouseMove={noZoom ? undefined : (e) => mouseX.set(e.pageX)}
      onMouseLeave={noZoom ? undefined : () => mouseX.set(Infinity)}
    >
      {rendered}
    </motion.div>
  )
})

export type DockIconProps = {
  children: ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  className?: string
  mouseX?: MotionValue<number>
  size?: number
  magnification?: number
  distance?: number
  disableMagnification?: boolean
}

export function DockIcon({
  children,
  label,
  active = false,
  onClick,
  className = '',
  mouseX,
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  disableMagnification = false,
}: DockIconProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const fallbackX = useMotionValue(Infinity)
  const sourceX = mouseX ?? fallbackX

  const distanceCalc = useTransform(sourceX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const targetSize = disableMagnification ? size : magnification
  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, targetSize, size],
  )
  const scaleSize = useSpring(sizeTransform, {
    mass: 0.12,
    stiffness: 170,
    damping: 16,
  })

  return (
    <button
      ref={ref}
      type="button"
      className={`dock-item${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      <motion.span
        className="dock-icon"
        style={
          disableMagnification
            ? undefined
            : { width: scaleSize, height: scaleSize }
        }
      >
        {children}
      </motion.span>
      <span className="dock-label">{label}</span>
    </button>
  )
}
