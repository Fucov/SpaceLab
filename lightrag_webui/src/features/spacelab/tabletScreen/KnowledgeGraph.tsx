import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  label: string
  radius: number
  color: string
}

const labels = ['微重力', '流体力学', '蛋白质', '燃烧', '材料科学', '对地观测', '细胞培养', '晶体生长', '热传导', '光谱分析', '辐射', '基因表达', '液滴动力学', '合金凝固', '大气成分']

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
    resize()

    // Init nodes
    if (nodesRef.current.length === 0) {
      const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
      nodesRef.current = labels.map((label, i) => ({
        x: Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
        y: Math.random() * canvas.height * 0.8 + canvas.height * 0.1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        label,
        radius: Math.random() * 4 + 3,
        color: colors[i % colors.length],
      }))
    }

    // Generate edges based on proximity
    const edges: [number, number][] = []
    for (let i = 0; i < nodesRef.current.length; i++) {
      for (let j = i + 1; j < nodesRef.current.length; j++) {
        if (Math.random() < 0.25) edges.push([i, j])
      }
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const nodes = nodesRef.current

      // Update positions
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 20 || n.x > w - 20) n.vx *= -1
        if (n.y < 20 || n.y > h - 20) n.vy *= -1
        n.x = Math.max(20, Math.min(w - 20, n.x))
        n.y = Math.max(20, Math.min(h - 20, n.y))
      }

      // Draw edges
      for (const [i, j] of edges) {
        ctx.beginPath()
        ctx.moveTo(nodes[i].x, nodes[i].y)
        ctx.lineTo(nodes[j].x, nodes[j].y)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = n.color + '40'
        ctx.fill()
        ctx.strokeStyle = n.color + '80'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = n.color
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(n.label, n.x, n.y + n.radius + 12)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    const resizeObs = new ResizeObserver(resize)
    resizeObs.observe(canvas.parentElement!)

    return () => {
      cancelAnimationFrame(animRef.current)
      resizeObs.disconnect()
    }
  }, [])

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 mb-2 tracking-wider uppercase">知识图谱网络</h3>
      <div className="h-44 rounded-lg border border-gray-200 bg-white overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  )
}
