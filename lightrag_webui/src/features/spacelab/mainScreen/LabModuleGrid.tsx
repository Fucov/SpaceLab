/**
 * 大屏中央 - 实验舱阵列矩阵（高密度重构）
 *
 * 重构说明：
 * 1. 使用 grid-cols-2 紧凑布局，最大化卡片信息密度
 * 2. 字体增大以保证大屏可读性（最小 12px）
 * 3. 每个卡片表面直接显示核心传感器数据
 * 4. 任务名 + 微观步骤编号（如 "细胞培养 [步骤 3/5: 营养液注入中]")
 */
import { useSpaceLabStore } from '../store'
import { useEffect, useState } from 'react'
import type { LabModule, LabModuleStatus } from '../types'
import { Thermometer, Gauge, Zap } from 'lucide-react'

const statusConfig: Record<LabModuleStatus, { label: string; color: string; borderColor: string; pulse?: boolean }> = {
  standby:    { label: '待机', color: 'text-gray-400',   borderColor: 'border-gray-500/25',   pulse: false },
  running:    { label: '运行', color: 'text-emerald-400', borderColor: 'border-emerald-500/35', pulse: true  },
  completed:  { label: '完成', color: 'text-blue-400',    borderColor: 'border-blue-500/35',   pulse: false },
  error:      { label: '异常', color: 'text-red-400',     borderColor: 'border-red-500/50',    pulse: true  },
  paused:     { label: '暂停', color: 'text-amber-400',  borderColor: 'border-amber-500/35', pulse: false },
}

/** 传感器条：温度 | 气压 | 功率（字体增大） */
function SensorStrip({ module }: { module: LabModule }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex items-center gap-1">
        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
        <span className="font-mono font-bold text-orange-300">{module.temperature.toFixed(1)}°C</span>
      </span>
      <span className="text-blue-400/30">|</span>
      <span className="flex items-center gap-1">
        <Gauge className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-mono font-bold text-blue-300">{module.pressure.toFixed(0)}kPa</span>
      </span>
      <span className="text-blue-400/30">|</span>
      <span className="flex items-center gap-1">
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
        <span className="font-mono font-bold text-yellow-300">{module.power}W</span>
      </span>
    </div>
  )
}

interface ModuleCardProps {
  module: LabModule
  onClick: () => void
}

function ModuleCard({ module, onClick }: ModuleCardProps) {
  const cfg = statusConfig[module.status]
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2500)
    return () => clearInterval(id)
  }, [])

  const activeStep = module.dagSteps.find((s) => s.isActive)
  const runningSteps = module.dagSteps.filter((s) => s.status === 'running')
  const totalGroups = Math.max(...module.dagSteps.map((s) => s.parallelGroup ?? 0), 0) + 1
  const currentGroup = activeStep?.parallelGroup ?? runningSteps[0]?.parallelGroup ?? 0

  return (
    <button
      onClick={onClick}
      className="group cursor-pointer rounded-xl border bg-blue-950/30 p-4 text-left transition-all duration-200 hover:bg-blue-900/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] relative overflow-hidden"
      style={{
        borderColor: cfg.pulse
          ? module.status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.3)'
          : 'rgba(59,130,246,0.15)',
      }}
    >
      {/* 左侧状态指示条 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
        style={{
          backgroundColor: module.status === 'running' ? '#10b981'
            : module.status === 'error' ? '#ef4444'
            : module.status === 'completed' ? '#3b82f6'
            : module.status === 'paused' ? '#f59e0b'
            : '#6b7280',
        }}
      />

      <div className="pl-2.5">
        {/* 顶部行 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{module.icon}</span>
            <div>
              <span className="text-base font-bold text-blue-50 tracking-wide">{module.name}</span>
              <div className="text-xs text-blue-400/40">{module.currentTask}</div>
            </div>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${cfg.color} ${cfg.borderColor}`}
          >
            {cfg.pulse && (
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  module.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                }`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${
                  module.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                }`} />
              </span>
            )}
            {cfg.label}
          </span>
        </div>

        {/* 微观步骤指示 */}
        {module.status === 'running' && (
          <div className="mb-3 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-3 py-2">
            <div className="text-xs text-cyan-300/80">
              {activeStep ? `步骤 ${currentGroup + 1}/${totalGroups}：` : `并行 ${runningSteps.length} 个步骤：`}
              <span className="font-bold text-cyan-100">
                {runningSteps.length > 1
                  ? runningSteps.map((s) => s.name).join(' || ')
                  : activeStep?.name ?? '进行中'}
              </span>
            </div>
          </div>
        )}
        {module.status === 'error' && (
          <div className="mb-3 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2">
            <span className="text-xs text-red-300/80">
              异常：{module.dagSteps.find((s) => s.status === 'error')?.name ?? '未知错误'}
            </span>
          </div>
        )}

        {/* 传感器条 */}
        <div className="mb-3">
          <SensorStrip module={module} />
        </div>

        {/* 进度条 */}
        <div className="h-2.5 rounded-full bg-blue-950/60 overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              module.status === 'error' ? 'bg-red-500'
                : module.status === 'completed' ? 'bg-blue-500'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
            }`}
            style={{ width: `${module.progress}%` }}
          />
        </div>

        {/* 底部：进度 + ETA */}
        <div className="flex items-center justify-between text-xs text-blue-400/50">
          <span className="font-mono font-semibold">{module.progress}%</span>
          <span>ETA: {module.eta}</span>
        </div>
      </div>
    </button>
  )
}

export default function LabModuleGrid() {
  const labModules = useSpaceLabStore((s) => s.labModules)
  const selectModule = useSpaceLabStore((s) => s.selectModule)

  const sorted = [...labModules].sort((a, b) => {
    const order: Record<LabModuleStatus, number> = { running: 0, error: 1, paused: 2, completed: 3, standby: 4 }
    return order[a.status] - order[b.status]
  })

  return (
    <div className="h-full overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-blue-800/30 scrollbar-track-transparent">
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((mod) => (
          <ModuleCard key={mod.id} module={mod} onClick={() => selectModule(mod.id)} />
        ))}
      </div>
    </div>
  )
}
