import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'

export interface SignaturePadHandle {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: () => string
}

interface Props {
  height?: number
  className?: string
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(({ height = 160, className = '' }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setIsEmpty(true)
    },
    isEmpty() {
      return isEmpty
    },
    toDataURL() {
      return canvasRef.current?.toDataURL('image/png') || ''
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2.2
  }, [])

  function getPoint(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent) {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawing.current = true
    lastPoint.current = getPoint(e)
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const p = getPoint(e)
    if (lastPoint.current) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    lastPoint.current = p
    if (isEmpty) setIsEmpty(false)
  }

  function end(e: React.PointerEvent) {
    drawing.current = false
    lastPoint.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      style={{ height, touchAction: 'none' }}
      className={`w-full bg-white border border-neutral-300 rounded-lg cursor-crosshair ${className}`}
    />
  )
})

export default SignaturePad
