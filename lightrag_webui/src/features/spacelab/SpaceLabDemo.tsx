import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

export default function SpaceLabDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef({ x: -1000, y: -1000 })

  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.floor((width * height) / 8000)
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
    }))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouse)

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const particles = particlesRef.current
      const mouse = mouseRef.current

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#050a18')
      grad.addColorStop(0.5, '#0a1628')
      grad.addColorStop(1, '#060d1f')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100, 180, 255, ${p.opacity})`
        ctx.fill()
      }

      // Draw connections
      const maxDist = 140
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.15
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }

        // Mouse interaction
        const dxm = particles[i].x - mouse.x
        const dym = particles[i].y - mouse.y
        const distMouse = Math.sqrt(dxm * dxm + dym * dym)
        if (distMouse < 200) {
          const alpha = (1 - distMouse / 200) * 0.4
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [initParticles])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#050a18' }}>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Content overlay */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-8">
        {/* Logo / Title */}
        <div className="text-center">
          <div className="mb-2 text-sm tracking-[0.3em] text-cyan-400/60 uppercase">
            空间站智能实验辅助系统
          </div>
          <h1
            className="text-6xl font-bold tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #22d3ee, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 60px rgba(59, 130, 246, 0.3)',
            }}
          >
            天宫智能助手
          </h1>
          <div className="mt-3 text-lg text-blue-200/40 tracking-widest">
            面向空间站实验柜的智能体调度与科学实验辅助系统
          </div>
        </div>

        {/* Subtitle */}
        <p className="max-w-xl text-center text-sm leading-relaxed text-blue-300/40">
          支持实验柜实时监控 · 智能助手对话 · 科学知识检索 · 跨屏指令联动
        </p>

        {/* Buttons */}
        <div className="flex gap-6 mt-4">
          <button
            onClick={() => navigate('/spacelab/main')}
            className="group relative cursor-pointer px-8 py-3 text-sm font-medium tracking-wider text-blue-100 transition-all duration-300 hover:text-white"
          >
            <span className="relative z-10">进入演示大屏</span>
            <div className="absolute inset-0 rounded border border-blue-500/30 bg-blue-900/20 backdrop-blur-sm transition-all duration-300 group-hover:border-blue-400/60 group-hover:bg-blue-800/30" />
            <div className="absolute -inset-[1px] rounded bg-gradient-to-r from-blue-600/0 via-blue-500/20 to-blue-600/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => navigate('/spacelab/tablet')}
            className="group relative cursor-pointer px-8 py-3 text-sm font-medium tracking-wider text-cyan-100 transition-all duration-300 hover:text-white"
          >
            <span className="relative z-10">进入平板终端</span>
            <div className="absolute inset-0 rounded border border-cyan-500/30 bg-cyan-900/20 backdrop-blur-sm transition-all duration-300 group-hover:border-cyan-400/60 group-hover:bg-cyan-800/30" />
            <div className="absolute -inset-[1px] rounded bg-gradient-to-r from-cyan-600/0 via-cyan-500/20 to-cyan-600/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-xs text-blue-400/20 tracking-widest">
          天宫空间站 · 双屏联动交互演示
        </div>
      </div>
    </div>
  )
}
