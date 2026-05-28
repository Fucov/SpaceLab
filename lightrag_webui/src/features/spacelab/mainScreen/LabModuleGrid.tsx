/**
 * 大屏中央 - 实验舱阵列矩阵
 * 设计：简洁克制、去掉花哨渐变和发光效果、以数据为核心
 */
import { useSpaceLabStore } from '../store'
import type { LabModule, LabModuleStatus } from '../types'
import { Thermometer, Gauge, Zap } from 'lucide-react'
import LabCabinet3D from './LabCabinet3D'

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
      className="group grid min-h-[178px] cursor-pointer grid-cols-[31%_1fr] gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-white/20 hover:bg-white/10"
    >
      <div className="min-w-0 self-stretch">
        <LabCabinet3D module={module} compact height="100%" />
      </div>

      <div className="flex min-w-0 flex-col">
        {/* 顶部行 */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{module.icon}</span>
              <div className="truncate text-sm font-bold tracking-wide text-slate-200">{module.name}</div>
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{module.currentTask}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${cfg.dot} ${module.status === 'running' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>

        {/* 微观步骤 */}
        {module.status === 'running' && (
          <div className="mb-2 rounded bg-white/5 px-2.5 py-1.5">
            <div className="line-clamp-1 text-[11px] text-slate-400">
              <span className="text-slate-500">步骤 </span>
              <span className="font-bold text-slate-300">{currentGroup + 1}/{totalGroups}</span>
              <span className="ml-1 text-slate-500">· </span>
              <span className="font-semibold text-slate-300">
                {runningSteps.length > 1
                  ? runningSteps.map((s) => s.name).join(' || ')
                  : activeStep?.name ?? '进行中'}
              </span>
            </div>
          </div>
        )}
        {module.status === 'error' && (
          <div className="mb-2 rounded border border-red-500/20 bg-red-500/10 px-2.5 py-1.5">
            <span className="line-clamp-1 text-[11px] text-red-400">
              异常：{module.dagSteps.find((s) => s.status === 'error')?.name}
            </span>
          </div>
        )}

        <div className="mt-auto">
          {/* 传感器 */}
          <div className="mb-2 grid grid-cols-3 gap-1.5 text-[11px]">
            <span className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-1 text-slate-400">
              <Thermometer className="h-3 w-3 text-orange-400/70" />
              <span className="font-mono font-semibold text-slate-300">{module.temperature.toFixed(1)}°</span>
            </span>
            <span className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-1 text-slate-400">
              <Gauge className="h-3 w-3 text-blue-400/70" />
              <span className="font-mono font-semibold text-slate-300">{module.pressure.toFixed(0)}kPa</span>
            </span>
            <span className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-1 text-slate-400">
              <Zap className="h-3 w-3 text-yellow-400/70" />
              <span className="font-mono font-semibold text-slate-300">{module.power}W</span>
            </span>
          </div>

          {/* 进度条 */}
          <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
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
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="font-mono">{module.progress}%</span>
            <span className="truncate">ETA: {module.eta}</span>
          </div>
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
    <div className="h-full overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <div className="grid grid-cols-2 gap-2.5">
        {sorted.map((mod) => (
          <ModuleCard key={mod.id} module={mod} onClick={() => selectModule(mod.id)} />
        ))}
      </div>
    </div>
  )
}
