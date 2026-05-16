/**
 * 大屏中央 - 实验舱阵列矩阵
 * 设计：简洁克制、去掉花哨渐变和发光效果、以数据为核心
 */
import { useSpaceLabStore } from '../store'
import type { LabModule, LabModuleStatus } from '../types'
import { Thermometer, Gauge, Zap } from 'lucide-react'

const statusConfig: Record<LabModuleStatus, { label: string; color: string; dot: string }> = {
  standby:   { label: '待机', color: 'text-slate-400', dot: 'bg-slate-500' },
  running:   { label: '运行', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  completed: { label: '完成', color: 'text-blue-400', dot: 'bg-blue-500' },
  error:     { label: '异常', color: 'text-red-400', dot: 'bg-red-500' },
  paused:    { label: '暂停', color: 'text-amber-400', dot: 'bg-amber-500' },
}

function ModuleCard({ module, onClick }: { module: LabModule; onClick: () => void }) {
  const cfg = statusConfig[module.status]
  const activeStep = module.dagSteps.find((s) => s.isActive)
  const runningSteps = module.dagSteps.filter((s) => s.status === 'running')
  const totalGroups = Math.max(...module.dagSteps.map((s) => s.parallelGroup ?? 0), 0) + 1
  const currentGroup = activeStep?.parallelGroup ?? runningSteps[0]?.parallelGroup ?? 0

  return (
    <button
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:bg-white/10 hover:border-white/20"
    >
      {/* 顶部行 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{module.icon}</span>
          <div>
            <div className="text-sm font-bold text-slate-200 tracking-wide">{module.name}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{module.currentTask}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${module.status === 'running' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
      </div>

      {/* 微观步骤 */}
      {module.status === 'running' && (
        <div className="mb-3 bg-white/5 rounded-lg px-3 py-2">
          <div className="text-[11px] text-slate-400">
            <span className="text-slate-500">步骤 </span>
            <span className="font-bold text-slate-300">{currentGroup + 1}/{totalGroups}</span>
            <span className="text-slate-500 ml-1">· </span>
            <span className="font-semibold text-slate-300">
              {runningSteps.length > 1
                ? runningSteps.map((s) => s.name).join(' || ')
                : activeStep?.name ?? '进行中'}
            </span>
          </div>
        </div>
      )}
      {module.status === 'error' && (
        <div className="mb-3 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
          <span className="text-[11px] text-red-400">
            异常：{module.dagSteps.find((s) => s.status === 'error')?.name}
          </span>
        </div>
      )}

      {/* 传感器 */}
      <div className="flex items-center gap-3 mb-3 text-[11px]">
        <span className="flex items-center gap-1 text-slate-400">
          <Thermometer className="w-3 h-3 text-orange-400/70" />
          <span className="font-mono font-semibold text-slate-300">{module.temperature.toFixed(1)}°</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <Gauge className="w-3 h-3 text-blue-400/70" />
          <span className="font-mono font-semibold text-slate-300">{module.pressure.toFixed(0)}kPa</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <Zap className="w-3 h-3 text-yellow-400/70" />
          <span className="font-mono font-semibold text-slate-300">{module.power}W</span>
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-white/5 rounded-full mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            module.status === 'error' ? 'bg-red-500'
              : module.status === 'completed' ? 'bg-blue-500'
              : 'bg-slate-500'
          }`}
          style={{ width: `${module.progress}%` }}
        />
      </div>

      {/* 底部 */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-mono">{module.progress}%</span>
        <span>ETA: {module.eta}</span>
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
    <div className="h-full overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((mod) => (
          <ModuleCard key={mod.id} module={mod} onClick={() => selectModule(mod.id)} />
        ))}
      </div>
    </div>
  )
}
