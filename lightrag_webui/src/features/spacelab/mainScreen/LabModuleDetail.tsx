import { useSpaceLabStore } from '../store'
import type { LabModule, DagStep } from '../types'
import { ArrowLeftIcon } from 'lucide-react'

function SensorGrid({ module }: { module: LabModule }) {
  const sensors = [
    { label: '温度', value: module.temperature.toFixed(1), unit: '°C', color: '#f59e0b' },
    { label: 'CO₂', value: (module.co2 * 100).toFixed(2), unit: '%', color: '#8b5cf6' },
    { label: '湿度', value: module.humidity.toFixed(1), unit: '%', color: '#06b6d4' },
    { label: '气压', value: module.pressure.toFixed(1), unit: 'kPa', color: '#3b82f6' },
  ]
  return (
    <div className="grid grid-cols-4 gap-3">
      {sensors.map((s) => (
        <div key={s.label} className="rounded-lg border border-blue-500/10 bg-blue-950/30 p-3 text-center">
          <div className="text-[10px] text-blue-400/50 mb-1">{s.label}</div>
          <div className="text-xl font-bold" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="text-[10px] text-blue-400/30">{s.unit}</div>
        </div>
      ))}
    </div>
  )
}

function DagFlow({ steps }: { steps: DagStep[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((step, i) => {
        const isCompleted = step.status === 'completed'
        const isRunning = step.status === 'running'
        const isError = step.status === 'error'
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 min-w-[90px] transition-all ${
                isCompleted
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : isRunning
                  ? 'border-cyan-400/50 bg-cyan-500/15 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                  : isError
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-blue-500/10 bg-blue-950/20'
              }`}
            >
              <div
                className={`text-[10px] font-medium ${
                  isCompleted ? 'text-emerald-400' : isRunning ? 'text-cyan-300' : isError ? 'text-red-400' : 'text-blue-400/40'
                }`}
              >
                {step.name}
              </div>
              <div className="text-[9px] text-blue-400/30">
                {step.duration || '--'}
              </div>
              {isRunning && (
                <div className="flex gap-0.5">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: '0.2s' }} />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: '0.4s' }} />
                </div>
              )}
            </div>
            {i < steps.length - 1 && (
              <svg width="24" height="12" className="mx-0.5 flex-shrink-0">
                <path d="M0 6 L18 6 M14 2 L18 6 L14 10" fill="none" stroke={isCompleted ? '#10b981' : 'rgba(59,130,246,0.2)'} strokeWidth="1.5" />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaskQueue({ module }: { module: LabModule }) {
  const priorityColor = { high: 'text-red-400 bg-red-500/15', medium: 'text-amber-400 bg-amber-500/15', low: 'text-blue-400 bg-blue-500/15' }
  return (
    <div>
      <h4 className="text-xs font-medium text-blue-300/60 mb-2">后续任务队列</h4>
      {module.taskQueue.length === 0 ? (
        <div className="text-xs text-blue-400/30 py-2">暂无排队任务</div>
      ) : (
        <div className="space-y-1.5">
          {module.taskQueue.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded border border-blue-500/10 bg-blue-950/20 px-3 py-2">
              <div>
                <div className="text-xs text-blue-200">{task.name}</div>
                <div className="text-[10px] text-blue-400/40">负责人: {task.assignee}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[9px] ${priorityColor[task.priority]}`}>
                  {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                </span>
                <span className="text-[10px] text-blue-400/40">{task.scheduledTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryList({ module }: { module: LabModule }) {
  const resultStyle = { success: 'text-emerald-400', failed: 'text-red-400', partial: 'text-amber-400' }
  return (
    <div>
      <h4 className="text-xs font-medium text-blue-300/60 mb-2">历史实验</h4>
      {module.history.length === 0 ? (
        <div className="text-xs text-blue-400/30 py-2">暂无历史记录</div>
      ) : (
        <div className="space-y-1.5">
          {module.history.map((h) => (
            <div key={h.id} className="rounded border border-blue-500/10 bg-blue-950/20 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-200">{h.name}</span>
                <span className={`text-[10px] ${resultStyle[h.result]}`}>{h.result === 'success' ? '成功' : h.result === 'failed' ? '失败' : '部分成功'}</span>
              </div>
              <div className="text-[10px] text-blue-400/40 mt-1">{h.summary}</div>
              <div className="text-[9px] text-blue-400/25 mt-0.5">{h.date} · {h.dataPoints} 数据点</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LabModuleDetail() {
  const selectedId = useSpaceLabStore((s) => s.selectedModuleId)
  const labModules = useSpaceLabStore((s) => s.labModules)
  const selectModule = useSpaceLabStore((s) => s.selectModule)

  const module = labModules.find((m) => m.id === selectedId)
  if (!module) return null

  return (
    <div className="h-full overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-blue-800/30 scrollbar-track-transparent">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => selectModule(null)}
          className="cursor-pointer flex items-center gap-1 rounded border border-blue-500/20 px-2 py-1 text-xs text-blue-300/60 transition-colors hover:text-blue-200 hover:border-blue-400/40"
        >
          <ArrowLeftIcon className="w-3 h-3" />
          返回
        </button>
        <span className="text-xl">{module.icon}</span>
        <h2 className="text-lg font-semibold text-blue-100">{module.name}</h2>
        <span className="text-xs text-blue-400/40">任务: {module.currentTask}</span>
      </div>

      {/* Sensors */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-blue-300/60 mb-2">实时传感器数据</h4>
        <SensorGrid module={module} />
      </div>

      {/* DAG */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-blue-300/60 mb-2">实验步骤流程 (DAG)</h4>
        <div className="rounded-lg border border-blue-500/10 bg-blue-950/20 p-3">
          <DagFlow steps={module.dagSteps} />
        </div>
      </div>

      {/* Task Queue & History */}
      <div className="grid grid-cols-2 gap-4">
        <TaskQueue module={module} />
        <HistoryList module={module} />
      </div>
    </div>
  )
}
