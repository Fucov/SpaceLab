import { GitBranch, ListChecks, ShieldCheck, Cpu, Clock3 } from 'lucide-react'
import { useSpaceLabStore } from '../store'
import type { GateCheckStatus, ScheduledTask, ScheduledTaskStatus } from '../types'

const statusText: Record<ScheduledTaskStatus, string> = {
  running: '运行中',
  ready: '已就绪',
  waiting_dependency: '等待依赖',
  waiting_resource: '等待资源',
  safety_rejected: '安全门拒绝',
  blocked_by_safety: '安全阻塞',
  completed: '已完成',
  failed: '失败',
}

const statusClass: Record<ScheduledTaskStatus, string> = {
  running: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
  ready: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  waiting_dependency: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  waiting_resource: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-200',
  safety_rejected: 'border-red-400/30 bg-red-400/10 text-red-200',
  blocked_by_safety: 'border-red-400/30 bg-red-400/10 text-red-200',
  completed: 'border-slate-400/15 bg-slate-400/10 text-slate-300',
  failed: 'border-red-400/30 bg-red-400/10 text-red-200',
}

const priorityText: Record<ScheduledTask['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const priorityClass: Record<ScheduledTask['priority'], string> = {
  high: 'text-red-200 border-red-400/25 bg-red-400/10',
  medium: 'text-amber-200 border-amber-400/20 bg-amber-400/10',
  low: 'text-slate-300 border-slate-400/15 bg-slate-400/10',
}

const gateText: Record<GateCheckStatus, string> = {
  passed: '通过',
  waiting: '等待',
  rejected: '拒绝',
  unchecked: '未查',
}

const gateClass: Record<GateCheckStatus, string> = {
  passed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  waiting: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-200',
  rejected: 'border-red-400/30 bg-red-400/10 text-red-200',
  unchecked: 'border-slate-400/15 bg-slate-400/10 text-slate-400',
}

function GateBadge({ label, status }: { label: string; status: GateCheckStatus }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${gateClass[status]}`}>
      {label} {gateText[status]}
    </span>
  )
}

function GateDetails({ task }: { task: ScheduledTask }) {
  const { dependency, resource, safety } = task.gates
  return (
    <div className="mt-2 hidden rounded border border-cyan-400/10 bg-slate-950/70 p-2 text-[10px] leading-relaxed text-slate-400 group-hover:block">
      <div className="grid gap-1.5">
        <div>
          <span className="text-slate-300">依赖门：</span>
          前驱 {dependency.predecessors.length ? dependency.predecessors.join('、') : '无'}；已完成 {dependency.done.length ? dependency.done.join('、') : '无'}；
          Pred⊆Done：{dependency.satisfied ? '满足' : '不满足'}。
        </div>
        <div>
          <span className="text-slate-300">资源门：</span>
          所需 {resource.required.join('、')}；占用 {resource.active.length ? resource.active.join('、') : '无'}；
          冲突：{resource.conflict ? '是' : '否'}。
        </div>
        <div>
          <span className="text-slate-300">安全门：</span>
          安全谓词 {safety.predicate}；判定：{safety.satisfied ? '满足' : '不满足'}。
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: ScheduledTask }) {
  return (
    <div className="group rounded border border-white/10 bg-white/[0.035] px-2.5 py-2 transition-colors hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]">
      <div className="flex items-start gap-2">
        <div className="w-8 shrink-0 font-mono text-[11px] font-bold text-cyan-200/80">
          #{String(task.order).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[11px] text-slate-400">{task.moduleName}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[9px] ${priorityClass[task.priority]}`}>
              优先级 {priorityText[task.priority]}
            </span>
          </div>
          <div className="mt-1 truncate text-[12px] font-semibold text-slate-100">{task.taskName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span className={`rounded border px-1.5 py-0.5 ${statusClass[task.status]}`}>{statusText[task.status]}</span>
            <span>{task.dagStage}</span>
          </div>
        </div>
        <div className="flex w-[82px] shrink-0 flex-col items-end gap-1">
          <GateBadge label="依赖门" status={task.gates.dependency.status} />
          <GateBadge label="资源门" status={task.gates.resource.status} />
          <GateBadge label="安全门" status={task.gates.safety.status} />
        </div>
      </div>
      <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-slate-500">
        <Clock3 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-slate-600" />
        <span className="line-clamp-2">{task.scheduleHint}</span>
      </div>
      <GateDetails task={task} />
    </div>
  )
}

export default function GlobalTaskQueuePanel() {
  const tasks = useSpaceLabStore((s) => s.scheduledTasks)
  const blockedCount = tasks.filter((task) =>
    task.status === 'waiting_dependency' ||
    task.status === 'waiting_resource' ||
    task.status === 'safety_rejected' ||
    task.status === 'blocked_by_safety'
  ).length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="border-b border-white/5 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-cyan-300/80" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">总体任务队列</span>
          </div>
          <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-200">
            阻塞 {blockedCount}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
          <span>PR-O3 调度视图</span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>按三门接纳排序</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="rounded border border-white/10 bg-white/[0.035] px-2 py-1.5">
          <div className="flex items-center gap-1 text-slate-500">
            <GitBranch className="h-3 w-3" />
            依赖门
          </div>
          <div className="mt-0.5 text-slate-300">前驱闭环</div>
        </div>
        <div className="rounded border border-white/10 bg-white/[0.035] px-2 py-1.5">
          <div className="flex items-center gap-1 text-slate-500">
            <Cpu className="h-3 w-3" />
            资源门
          </div>
          <div className="mt-0.5 text-slate-300">互斥仲裁</div>
        </div>
        <div className="rounded border border-white/10 bg-white/[0.035] px-2 py-1.5">
          <div className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            安全门
          </div>
          <div className="mt-0.5 text-slate-300">阈值校验</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}
