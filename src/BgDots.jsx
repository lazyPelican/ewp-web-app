import { useEffect, useRef } from "react"

export default function BgDots({ dark }) {
  const canvasRef   = useRef(null)
  const mouseRef    = useRef({ x: -9999, y: -9999 })
  const lastMoveRef = useRef(0)
  const rafRef      = useRef(null)
  const dotR        = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width  = window.innerWidth  * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width  = window.innerWidth  + "px"
      canvas.style.height = window.innerHeight + "px"
    }
    resize()
    window.addEventListener("resize", resize)

    const onMove = e => {
      mouseRef.current    = { x: e.clientX, y: e.clientY }
      lastMoveRef.current = Date.now()
    }
    const onLeave = () => {
      mouseRef.current    = { x: -9999, y: -9999 }
      lastMoveRef.current = 0
    }
    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", onLeave)

    const GRID      = 32
    const BASE_R    = 1.4   // resting dot radius
    const MAX_R     = 4.0   // subtle peak — just a gentle swell
    const INFLUENCE = 72    // small zone, tight around cursor
    const LERP      = 0.12
    const IDLE_MS   = 1800

    let running = true

    const draw = () => {
      if (!running) return
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const idle = Date.now() - lastMoveRef.current > IDLE_MS
      const { x: rawMx, y: rawMy } = mouseRef.current
      const mx = idle ? -9999 : rawMx
      const my = idle ? -9999 : rawMy

      const cols  = Math.ceil(window.innerWidth  / GRID) + 1
      const rows  = Math.ceil(window.innerHeight / GRID) + 1
      const total = cols * rows
      while (dotR.current.length < total) dotR.current.push(BASE_R)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col
          const lx  = col * GRID
          const ly  = row * GRID

          const dx   = lx - mx
          const dy   = ly - my
          const dist = Math.sqrt(dx * dx + dy * dy)

          // Hemisphere profile for a clean dome shape
          const nd      = dist / INFLUENCE
          const zHeight = nd < 1 ? Math.sqrt(Math.max(0, 1 - nd * nd)) : 0
          const targetR = BASE_R + (MAX_R - BASE_R) * zHeight

          const prev = dotR.current[idx]
          const r    = prev + (targetR - prev) * LERP
          dotR.current[idx] = r

          const elevated = (r - BASE_R) / (MAX_R - BASE_R)
          const px = lx * dpr
          const py = ly * dpr
          const rp = r  * dpr

          ctx.save()

          // Subtle radial shadow pointing away from push centre
          if (elevated > 0.05) {
            const angle = dist > 1 ? Math.atan2(dy, dx) : 0
            ctx.shadowColor   = dark
              ? `rgba(0,0,0,${0.45 * elevated})`
              : `rgba(50,28,5,${0.25 * elevated})`
            ctx.shadowBlur    = rp * 1.4 * elevated
            ctx.shadowOffsetX = Math.cos(angle) * rp * 0.5 * elevated
            ctx.shadowOffsetY = Math.sin(angle) * rp * 0.6 * elevated
          }

          // Sphere gradient with upper-left highlight
          const hx   = px - rp * 0.30
          const hy   = py - rp * 0.30
          const grad = ctx.createRadialGradient(hx, hy, rp * 0.04, px, py, rp)

          if (dark) {
            const op = 0.18 + 0.55 * elevated
            grad.addColorStop(0.00, `rgba(255,238,175,${Math.min(op * 1.9, 0.88)})`)
            grad.addColorStop(0.28, `rgba(210,175,105,${op})`)
            grad.addColorStop(0.68, `rgba(168,132,62,${op * 0.75})`)
            grad.addColorStop(1.00, `rgba(55,34,8,${op * 0.55 + 0.05})`)
          } else {
            const op = 0.22 + 0.48 * elevated
            grad.addColorStop(0.00, `rgba(240,205,138,${Math.min(op * 2.0, 0.90)})`)
            grad.addColorStop(0.28, `rgba(168,128,60,${op})`)
            grad.addColorStop(0.68, `rgba(125,94,36,${op * 0.72})`)
            grad.addColorStop(1.00, `rgba(42,24,4,${op * 0.48 + 0.04})`)
          }

          ctx.beginPath()
          ctx.arc(px, py, Math.max(rp, 0.5), 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
          ctx.restore()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
    }
  }, [dark])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}
    />
  )
}
