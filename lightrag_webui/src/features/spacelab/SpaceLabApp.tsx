import { useNavigate } from 'react-router-dom'
import { useSpaceLabStore } from './store'
import ComputePanel from './mainScreen/ComputePanel'
import AlertLog from './mainScreen/AlertLog'
import LabModuleGrid from './mainScreen/LabModuleGrid'
import LabModuleDetail from './mainScreen/LabModuleDetail'
import GlobalParams from './mainScreen/GlobalParams'
import EquipmentPanel from './mainScreen/EquipmentPanel'
import { ArrowLeftIcon, MonitorIcon } from 'lucide-react'

export default function SpaceLabApp() {
  const navigate = useNavigate()
  const selectedModuleId = useSpaceLabStore((s) => s.selectedModuleId)

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050a18 0%, #0a1628 50%, #060d1f 100%)' }}
    >
      {/* Top bar */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-blue-500/15 bg-blue-950/40 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/spacelab')}
            className="cursor-pointer flex items-center gap-1 text-xs text-blue-400/60 transition-colors hover:text-blue-300"
          >
            <ArrowLeftIcon className="w-3 h-3" />
            返回
          </button>
          <div className="h-4 w-px bg-blue-500/20" />
          <MonitorIcon className="w-4 h-4 text-blue-400/60" />
          <span className="text-sm font-semibold text-blue-100 tracking-wider">SpaceLabOS 演示大屏</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-blue-400/40">
          <span>天宫空间站 · 实验舱监控中心</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            系统在线
          </span>
        </div>
      </header>

      {/* Main content - 3 column layout */}
      <div className="flex flex-1 min-h-0 gap-px bg-blue-500/5">
        {/* Left column - 25% */}
        <div className="flex w-[25%] min-w-[240px] flex-col gap-px">
          <div className="flex-1 overflow-hidden border-r border-blue-500/10 bg-blue-950/20 p-3">
            <ComputePanel />
          </div>
          <div className="flex-1 overflow-hidden border-r border-t border-blue-500/10 bg-blue-950/20 p-3 flex flex-col min-h-0">
            <AlertLog />
          </div>
        </div>

        {/* Center column - 50% */}
        <div className="flex-1 overflow-hidden bg-blue-950/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wider text-blue-400/80 uppercase">
              实验舱阵列
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-blue-400/40">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 运行中
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-500" /> 待机
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> 异常
              </span>
            </div>
          </div>
          {selectedModuleId ? <LabModuleDetail /> : <LabModuleGrid />}
        </div>

        {/* Right column - 25% */}
        <div className="flex w-[25%] min-w-[240px] flex-col gap-px">
          <div className="flex-1 overflow-hidden border-l border-blue-500/10 bg-blue-950/20 p-3">
            <GlobalParams />
          </div>
          <div className="flex-1 overflow-hidden border-l border-t border-blue-500/10 bg-blue-950/20 p-3">
            <EquipmentPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
