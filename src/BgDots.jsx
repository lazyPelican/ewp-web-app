import { useEffect, useRef } from "react"

/**
 * Floating particle background with cursor repulsion (antigravity effect).
 * Dots drift freely with organic motion; the cursor pushes them away,
 * leaving a clear bubble of space around the mouse.
 */
export default function BgDots({ dark }) {
  const canvasRef   = useRef(null)
  const mouseRef    = useRef({ x: -9999, y: -9999 })
  const lastMoveRef = useRef(0)
  const rafRef      = useRef(null)
  const dotsRef     = useRef(null)   // particle array, init once

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

    // ── constants ────────────────────────────────────────────────────────
    const COUNT       = Math.floor((window.innerWidth * window.innerHeight) / 8000)
    const BASE_R      = 2.0       // dot radius (logical px)
    const REPEL_R     = 130       // how far cursor repels
    const REPEL_FORCE = 0.55      // push strength
    const MAX_SPEED   = 1.1
    const DRIFT       = 0.012     // random drift per frame
    const FRICTION    = 0.985     // velocity damping
    const IDLE_MS     = 2000

    // Build particle list once
    if (!dotsRef.current) {
      dotsRef.current = Array.from({ length: COUNT }, () => ({
        x:  Math.random() * window.innerWidth,
        y:  Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        // individual oscillation for organic feel
        phase: Math.random() * Math.PI * 2,
        freq:  0.004 + Math.random() * 0.006,
        amp:   0.08  + Math.random() * 0.10,
      }))
    }

    let running = true
    let frame   = 0

    const draw = () => {
      if (!running) return
      frame++
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const idle = Date.now() - lastMoveRef.current > IDLE_MS
      const mx   = idle ? -9999 : mouseRef.current.x
      const my   = idle ? -9999 : mouseRef.current.y

      const dots = dotsRef.current
      const W    = window.innerWidth
      const H    = window.innerHeight

      // dot color
      const baseColor = dark ? "201,158,100" : "168,129,71"

      for (const d of dots) {
        // ── organic drift using sine oscillation ──────────────────────────
        d.vx += Math.sin(d.phase + frame * d.freq) * d.amp * DRIFT
        d.vy += Math.cos(d.phase + frame * d.freq * 0.7) * d.amp * DRIFT

        // ── cursor repulsion ──────────────────────────────────────────────
        if (mx > -1000) {
          const dx   = d.x - mx
          const dy   = d.y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < REPEL_R && dist > 0.1) {
            const force = (1 - dist / REPEL_R) * REPEL_FORCE
            d.vx += (dx / dist) * force
            d.vy += (dy / dist) * force
          }
        }

        // ── friction + speed cap ──────────────────────────────────────────
        d.vx *= FRICTION
        d.vy *= FRICTION
        const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy)
        if (speed > MAX_SPEED) {
          d.vx = (d.vx / speed) * MAX_SPEED
          d.vy = (d.vy / speed) * MAX_SPEED
        }

        // ── move + wrap ───────────────────────────────────────────────────
        d.x += d.vx
        d.y += d.vy
        if (d.x < -10) d.x = W + 10
        if (d.x > W + 10) d.x = -10
        if (d.y < -10) d.y = H + 10
        if (d.y > H + 10) d.y = -10

        // ── draw dot with soft glow ───────────────────────────────────────
        const px = d.x * dpr
        const py = d.y * dpr
        const rp = BASE_R * dpr

        // glow layer (larger, very transparent)
        const glow = ctx.createRadialGradient(px, py, 0, px, py, rp * 3.5)
        glow.addColorStop(0,   `rgba(${baseColor},${dark ? 0.18 : 0.14})`)
        glow.addColorStop(1,   `rgba(${baseColor},0)`)
        ctx.beginPath()
        ctx.arc(px, py, rp * 3.5, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // core dot
        ctx.beginPath()
        ctx.arc(px, py, rp, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${baseColor},${dark ? 0.55 : 0.45})`
        ctx.fill()
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
