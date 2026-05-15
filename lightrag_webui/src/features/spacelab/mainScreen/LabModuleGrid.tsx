import { useSpaceLabStore } from '../store'
import type { LabModule, LabModuleStatus } from '../types'

const statusConfig: Record<LabModuleStatus, { label: string; color: string; bg: string; pulse?: boolean }> = {
  standby: { label: '待机', color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' },
  running: { label: '运行中', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', pulse: true },
  completed: { label: '已完成', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  error: { label: '异常', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', pulse: true },
  paused: { label: '暂停', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
}

function ModuleCard({ module, onClick }: { module: LabModule; onClick: () => void }) {
  const cfg = statusConfig[module.status]

  return (
    <button
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-blue-500/15 bg-blue-950/40 p-4 text-left transition-all duration-200 hover:border-blue-400/30 hover:bg-blue-900/30"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{module.icon}</span>
          <span className="text-sm font-medium text-blue-100">{module.name}</span>
        </div>
        <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.pulse && (
            <span className="relative flex h-1.5 w-1.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${module.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${module.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
            </span>
          )}
          {cfg.label}
        </span>
      </div>

      <div className="text-xs text-blue-300/60 mb-2">当前任务: {module.currentTask}</div>

      {/* Progress bar */}
      <div className="mb-2 h-1.5 rounded-full bg-blue-900/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            module.status === 'error' ? 'bg-red-500' : module.status === 'completed' ? 'bg-blue-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${module.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-blue-400/40">
        <span>进度 {module.progress}%</span>
        <span>预计完成: {module.eta}</span>
      </div>
    </button>
  )
}

export default function LabModuleGrid() {
  const labModules = useSpaceLabStore((s) => s.labModules)
  const selectModule = useSpaceLabStore((s) => s.selectModule)

  return (
    <div className="h-full overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-blue-800/30 scrollbar-track-transparent">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {labModules.map((mod) => (
          <ModuleCard key={mod.id} module={mod} onClick={() => selectModule(mod.id)} />
        ))}
      </div>
    </div>
  )
}
