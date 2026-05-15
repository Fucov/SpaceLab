/**
 * 大屏右侧 - 全局资源仲裁分配面板（功能扩充）
 *
 * 重构说明：
 * 1. 保留全局环境参数（温度、气压等），字体已增大
 * 2. 新增"全局资源仲裁分配 (Global Arbitration)"动态面板
 * 3. 展示主供电网电力的动态分配流向（各舱体分配百分比 + 数值）
 * 4. 体现 Agent 在后台做宏观调配的价值
 */

import { useSpaceLabStore } from '../store'
import { useEffect, useRef } from 'react'
import { Scale, Zap, Thermometer, Droplets, Gauge, Volume2 } from 'lucide-react'

/** 全局环境参数（原有功能保留但紧凑化） */
function GlobalParamsMini() {
  const globalParams = useSpaceLabStore((s) => s.globalParams)
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-2">
        <Thermometer className="w-4 h-4" />
        全站环境
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {globalParams.map((p) => {
          const Icon = p.icon === '🌡️' ? Thermometer
            : p.icon === '💧' ? Droplets
            : p.icon === '🔵' ? Gauge
            : Volume2
          const trendColor = p.trend === 'up' ? 'text-red-400' : p.trend === 'down' ? 'text-blue-400' : 'text-blue-300'
          return (
            <div key={p.label} className="rounded-lg border border-blue-500/15 bg-blue-950/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-400/50 font-medium">{p.label}</span>
                <Icon className="w-4 h-4 text-blue-400/40" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-blue-50">{p.value}</span>
                <span className="text-sm text-blue-400/40">{p.unit}</span>
              </div>
              <div className={`text-xs mt-1 ${trendColor}/60`}>
                {p.trend === 'up' ? '↑ 上升趋势' : p.trend === 'down' ? '↓ 下降趋势' : '→ 稳定'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 全局资源仲裁分配（电力流向图） */
function GlobalArbitration() {
  const allocations = useSpaceLabStore((s) => s.arbitrationAllocations)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    const alloc = allocations[0]
    if (!alloc) return

    const targets = alloc.targets
    const total = alloc.sourceTotal
    const nodeX = W * 0.12
    const nodeW = 72
    const nodeH = 44
    const startY = H / 2 - (targets.length * 32) / 2

    const particles: { x: number; y: number; targetIdx: number; progress: number; speed: number }[] = []
    const addParticle = () => {
      if (particles.length < 25) {
        const ti = Math.floor(Math.random() * targets.length)
        particles.push({ x: nodeX + nodeW, y: H / 2, targetIdx: ti, progress: 0, speed: 0.004 + Math.random() * 0.008 })
      }
    }
    const particleTimer = setInterval(addParticle, 400)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // 背景网格
      ctx.strokeStyle = 'rgba(59,130,246,0.06)'
      ctx.lineWidth = 1
      for (let y = 0; y < H; y += 24) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // 源节点
      const srcGrad = ctx.createLinearGradient(nodeX, H / 2 - nodeH / 2, nodeX, H / 2 + nodeH / 2)
      srcGrad.addColorStop(0, '#1e3a5f')
      srcGrad.addColorStop(1, '#0f172a')
      ctx.fillStyle = srcGrad
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(nodeX, H / 2 - nodeH / 2, nodeW, nodeH, 8)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#93c5fd'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(alloc.sourceName, nodeX + nodeW / 2, H / 2 - 4)
      ctx.fillStyle = '#60a5fa'
      ctx.font = 'bold 12px monospace'
      ctx.fillText(`${total}${alloc.sourceUnit}`, nodeX + nodeW / 2, H / 2 + 14)

      // 目标节点 + 连接线
      targets.forEach((t, i) => {
        const ty = startY + i * 32 + 16
        const tgtX = W * 0.7
        const tgtW = 60
        const tgtH = 24

        const cpX = nodeX + nodeW + (tgtX - nodeX - nodeW) * 0.5
        const alpha = t.percentage / 100

        // 贝塞尔曲线
        ctx.beginPath()
        ctx.moveTo(nodeX + nodeW, H / 2)
        ctx.bezierCurveTo(cpX, H / 2, cpX, ty, tgtX, ty)
        ctx.strokeStyle = t.color + Math.round(alpha * 0.7 * 255).toString(16).padStart(2, '0')
        ctx.lineWidth = 1.5 + alpha * 2.5
        ctx.stroke()

        // 目标节点
        ctx.fillStyle = t.color + '28'
        ctx.strokeStyle = t.color + '90'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(tgtX, ty - tgtH / 2, tgtW, tgtH, 5)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = t.color
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(t.moduleName.replace('舱', ''), tgtX + 4, ty - 1)
        ctx.fillStyle = t.color + 'bb'
        ctx.font = '8px monospace'
        ctx.fillText(`${t.currentValue}${t.unit}`, tgtX + 4, ty + 11)

        // 百分比标签
        const midX = (nodeX + nodeW + tgtX) / 2
        ctx.fillStyle = t.color + 'dd'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${t.percentage}%`, midX, ty - 4)
      })

      // 流动粒子
      particles.forEach((p, pi) => {
        const tgt = targets[p.targetIdx]
        const tgtY = startY + p.targetIdx * 32 + 16
        const tgtX = W * 0.7
        const cpX = nodeX + nodeW + (tgtX - nodeX - nodeW) * 0.5

        p.progress += p.speed

        const t = p.progress
        const x = Math.pow(1 - t, 3) * (nodeX + nodeW)
          + 3 * Math.pow(1 - t, 2) * t * cpX
          + 3 * (1 - t) * Math.pow(t, 2) * cpX
          + Math.pow(t, 3) * tgtX
        const y = Math.pow(1 - t, 3) * (H / 2)
          + 3 * Math.pow(1 - t, 2) * t * (H / 2)
          + 3 * (1 - t) * Math.pow(t, 2) * tgtY
          + Math.pow(t, 3) * tgtY

        p.x = x
        p.y = y

        if (p.progress >= 1) {
          particles.splice(pi, 1)
          return
        }

        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = tgt.color + 'cc'
        ctx.fill()
      })

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      clearInterval(particleTimer)
    }
  }, [allocations])

  return (
    <div className="flex flex-col gap-3">
      {/* 电力仲裁分配 */}
      <div className="bg-blue-950/20 rounded-xl border border-blue-500/15 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">全局仲裁</h3>
        </div>

        <canvas
          ref={canvasRef}
          width={300}
          height={168}
          className="w-full rounded-lg"
          style={{ maxHeight: 168 }}
        />

        <div className="flex flex-wrap gap-2 mt-2">
          {allocations[0]?.targets.map((t) => (
            <div key={t.moduleId} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
              <span className="text-blue-300/70">{t.moduleName.replace('舱', '')}</span>
              <span className="font-bold font-mono text-blue-100">{t.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent 调配建议 */}
      <div className="bg-blue-950/20 rounded-xl border border-blue-500/15 p-3">
        <div className="text-xs text-blue-400/50 mb-2">Agent 宏观调配建议</div>
        <div className="space-y-2">
          {[
            { reason: '材料实验舱正在冷却', action: '降低该舱供电 5%', delta: '-0.6kW', color: '#f59e0b' },
            { reason: 'LLM 分析队列积压', action: '提升推理单元优先级', delta: '+2%', color: '#3b82f6' },
            { reason: '液冷泵B告警', action: '重新分配冷却预算', delta: '切换', color: '#ef4444' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-blue-300/70 truncate text-xs">{item.reason}</div>
                <div className="text-sm text-blue-200">
                  {item.action} <span className="font-bold font-mono" style={{ color: item.color }}>{item.delta}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EquipmentPanel() {
  return (
    <div className="flex flex-col gap-4">
      <GlobalParamsMini />
      <GlobalArbitration />
    </div>
  )
}
