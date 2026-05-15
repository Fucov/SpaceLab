/**
 * 大屏中央 - 实验舱阵列矩阵（高密度重构）
 *
 * 重构说明：
 * 1. 使用 grid-cols-2 紧凑布局，最大化卡片信息密度
 * 2. 去除大面积留白，每个卡片表面直接显示核心传感器数据
 * 3. 任务名 + 微观步骤编号（如 "细胞培养 [步骤 3/5: 营养液注入中]")
 * 4. 每张卡片右上角显示实时遥测（温度 | 气压 | 功率）
 */
import { useSpaceLabStore } from '../store'
import { useEffect, useState } from 'react'
import type { LabModule, LabModuleStatus } from '../types'
import { Thermometer, Gauge, Zap } from 'lucide-react'

const statusConfig: Record<LabModuleStatus, { label: string; color: string; borderColor: string; pulse?: boolean }> = {
  standby:    { label: '待机', color: 'text-gray-400',   borderColor: 'border-gray-500/20',   pulse: false },
  running:    { label: '运行', color: 'text-emerald-400', borderColor: 'border-emerald-500/30', pulse: true  },
  completed:  { label: '完成', color: 'text-blue-400',    borderColor: 'border-blue-500/30',   pulse: false },
  error:      { label: '异常', color: 'text-red-400',     borderColor: 'border-red-500/40',    pulse: true  },
  paused:     { label: '暂停', color: 'text-amber-400',  borderColor: 'border-amber-500/30', pulse: false },
}

/** 微型传感器条：温度 | 气压 | 功率 */
function SensorStrip({ module }: { module: LabModule }) {
  return (
    <div className="flex items-center gap-2 text-[9px] text-blue-300/50">
      <span className="flex items-center gap-0.5">
        <Thermometer className="w-2.5 h-2.5 text-orange-400/60" />
        <span className="font-mono">{module.temperature.toFixed(1)}°</span>
      </span>
      <span className="text-blue-400/30">|</span>
      <span className="flex items-center gap-0.5">
        <Gauge className="w-2.5 h-2.5 text-blue-400/60" />
        <span className="font-mono">{module.pressure.toFixed(0)}kPa</span>
      </span>
      <span className="text-blue-400/30">|</span>
      <span className="flex items-center gap-0.5">
        <Zap className="w-2.5 h-2.5 text-yellow-400/60" />
        <span className="font-mono">{module.power}W</span>
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

  // 模拟传感器数据小幅波动
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2500)
    return () => clearInterval(id)
  }, [])

  // 找到当前活跃步骤
  const activeStep = module.dagSteps.find((s) => s.isActive)
  const runningSteps = module.dagSteps.filter((s) => s.status === 'running')
  const totalGroups = Math.max(...module.dagSteps.map((s) => s.parallelGroup ?? 0), 0) + 1

  // 计算当前分组（活跃步骤所在组）
  const currentGroup = activeStep?.parallelGroup ?? runningSteps[0]?.parallelGroup ?? 0

  return (
    <button
      onClick={onClick}
      className="group cursor-pointer rounded-lg border bg-blue-950/25 p-3 text-left transition-all duration-150 hover:bg-blue-900/35 hover:shadow-[0_0_16px_rgba(59,130,246,0.1)] relative overflow-hidden"
      style={{
        borderColor: cfg.pulse
          ? module.status === 'error'
            ? 'rgba(239,68,68,0.3)'
            : 'rgba(16,185,129,0.25)'
          : 'rgba(59,130,246,0.12)',
      }}
    >
      {/* 左侧状态指示条 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l"
        style={{
          backgroundColor: module.status === 'running' ? '#10b981'
            : module.status === 'error' ? '#ef4444'
            : module.status === 'completed' ? '#3b82f6'
            : module.status === 'paused' ? '#f59e0b'
            : '#6b7280',
        }}
      />

      <div className="pl-1.5">
        {/* 顶部行：图标 + 名称 + 状态标签 */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{module.icon}</span>
            <span className="text-xs font-semibold text-blue-100 tracking-wide">{module.name}</span>
          </div>
          <span
            className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${cfg.color} ${cfg.borderColor}`}
          >
            {cfg.pulse && (
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    module.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                    module.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                  }`}
                />
              </span>
            )}
            {cfg.label}
          </span>
        </div>

        {/* 任务名 + 微观步骤指示（高密度信息） */}
        <div className="mb-1.5">
          <div className="text-[10px] text-blue-200/70 leading-tight">
            任务：{module.currentTask}
          </div>
          {module.status === 'running' && (
            <div className="text-[9px] text-cyan-400/60 mt-0.5">
              [{activeStep ? `步骤 ${currentGroup + 1}/${totalGroups}：` : `并行 ${runningSteps.length}个步骤：`}
              {runningSteps.length > 1
                ? runningSteps.map((s) => s.name).join(' || ')
                : activeStep?.name ?? '进行中'}]
            </div>
          )}
          {module.status === 'error' && (
            <div className="text-[9px] text-red-400/70 mt-0.5">
              [{module.dagSteps.find((s) => s.status === 'error')?.name ?? '异常'}]
            </div>
          )}
        </div>

        {/* 传感器条（高密度遥测） */}
        <SensorStrip module={module} />

        {/* 进度条 */}
        <div className="mt-1.5 h-1 rounded-full bg-blue-950/60 overflow-hidden">
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
        <div className="flex items-center justify-between mt-1 text-[9px] text-blue-400/35">
          <span>{module.progress}%</span>
          <span>ETA: {module.eta}</span>
        </div>
      </div>
    </button>
  )
}

export default function LabModuleGrid() {
  const labModules = useSpaceLabStore((s) => s.labModules)
  const selectModule = useSpaceLabStore((s) => s.selectModule)

  // 按状态优先级排序：running > error > paused > completed > standby
  const sorted = [...labModules].sort((a, b) => {
    const order: Record<LabModuleStatus, number> = { running: 0, error: 1, paused: 2, completed: 3, standby: 4 }
    return order[a.status] - order[b.status]
  })

  return (
    <div className="h-full overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-blue-800/30 scrollbar-track-transparent">
      {/* grid-cols-2 紧凑布局 */}
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((mod) => (
          <ModuleCard key={mod.id} module={mod} onClick={() => selectModule(mod.id)} />
        ))}
      </div>
    </div>
  )
}
