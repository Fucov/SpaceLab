/**
 * 大屏主控应用（天宫智能助手 演示大屏）
 *
 * 布局说明（重构后）：
 * 左侧（21%）：算力与链路 + 智能体调度中心（ComputePanel） + 总体任务队列/告警日志
 * 中央（57%）：实验舱阵列矩阵 / 舱体详情（LabModuleGrid / LabModuleDetail）
 * 右侧（22%）：全站环境 + 电源系统 + 电力分配（EquipmentPanel）
 */

import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSpaceLabStore } from './store'
import ComputePanel from './mainScreen/ComputePanel'
import AlertLog from './mainScreen/AlertLog'
import GlobalTaskQueuePanel from './mainScreen/GlobalTaskQueuePanel'
import LabModuleGrid from './mainScreen/LabModuleGrid'
import LabModuleDetail from './mainScreen/LabModuleDetail'
import EquipmentPanel from './mainScreen/EquipmentPanel'
import { ArrowLeftIcon, Maximize2Icon, Minimize2Icon, MonitorIcon } from 'lucide-react'

type LeftBottomTab = 'queue' | 'logs'

export default function SpaceLabApp() {
  const navigate = useNavigate()
  const selectedModuleId = useSpaceLabStore((s) => s.selectedModuleId)
  const tickTelemetry = useSpaceLabStore((s) => s.tickTelemetry)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [leftBottomTab, setLeftBottomTab] = useState<LeftBottomTab>('queue')

  useEffect(() => {
    tickTelemetry()
    const id = window.setInterval(tickTelemetry, 2500)
    return () => window.clearInterval(id)
  }, [tickTelemetry])

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', syncFullscreen)
    syncFullscreen()
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await document.documentElement.requestFullscreen()
  }

  return (
    <div
      className="fixed inset-0 flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050B14 0%, #0a1628 50%, #060d1f 100%)' }}
    >
      {/* 顶部导航栏 */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-blue-500/15 bg-blue-950/40 px-4 backdrop-blur">
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
          <span className="text-sm font-semibold text-blue-100 tracking-wider">天宫智能助手</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-blue-400/40">
          <span>天宫空间站 · 实验舱监控中心</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            系统在线
          </span>
          <button
            onClick={toggleFullscreen}
            className="cursor-pointer flex items-center gap-1.5 rounded border border-blue-400/25 bg-blue-400/10 px-2.5 py-1 text-[11px] font-medium text-blue-100 transition-colors hover:border-blue-300/50 hover:bg-blue-400/20"
          >
            {isFullscreen ? <Minimize2Icon className="h-3 w-3" /> : <Maximize2Icon className="h-3 w-3" />}
            {isFullscreen ? '退出全屏' : '全屏展示'}
          </button>
        </div>
      </header>

      {/* 主内容区 - 三栏布局 */}
      <div className="flex flex-1 min-h-0 gap-2 bg-blue-500/5 p-2">
        {/* ========== 左侧栏（21%） ========== */}
        <div className="flex w-[21%] min-w-[220px] flex-col gap-2">
          {/* 算力池 + 智能体调度中心 */}
          <div className="flex-[0.9] overflow-hidden rounded border border-blue-500/10 bg-blue-950/20 p-2.5">
            <ComputePanel />
          </div>
          {/* 总体任务队列 / 告警日志 */}
          <div className="flex-[1.35] overflow-hidden rounded border border-blue-500/10 bg-blue-950/20 p-2.5 flex flex-col min-h-0">
            <div className="mb-2 flex shrink-0 rounded border border-white/10 bg-white/[0.03] p-0.5">
              <button
                onClick={() => setLeftBottomTab('queue')}
                className={`flex-1 cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  leftBottomTab === 'queue'
                    ? 'bg-cyan-400/15 text-cyan-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                任务队列
              </button>
              <button
                onClick={() => setLeftBottomTab('logs')}
                className={`flex-1 cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  leftBottomTab === 'logs'
                    ? 'bg-cyan-400/15 text-cyan-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                告警日志
              </button>
            </div>
            {leftBottomTab === 'queue' ? <GlobalTaskQueuePanel /> : <AlertLog />}
          </div>
        </div>

        {/* ========== 中央栏（57%） ========== */}
        <div className="w-[57%] overflow-hidden rounded border border-blue-500/10 bg-blue-950/10 p-2.5">
          {/* 标题栏 */}
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

        {/* ========== 右侧栏（22%） ========== */}
        <div className="flex w-[22%] min-w-[230px] flex-col">
          <div className="flex-1 overflow-hidden rounded border border-blue-500/10 bg-blue-950/20 p-2.5">
            <EquipmentPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
