import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Edges, Html, Line, OrbitControls } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import type { DagStep, LabModule } from '../types'

type RunState = 'running' | 'waiting' | 'error' | 'completed' | 'idle'

interface ActiveInstrumentInfo {
  instrument: string
  label: string
  status: RunState
}

interface LabExperiment3DProps {
  module: LabModule
  compact?: boolean
  interactive?: boolean
  autoRotate?: boolean
  height?: number | string
  currentStepId?: string
  currentStepName?: string
  dagSteps?: DagStep[]
}

const accentByType: Record<LabModule['moduleType'], string> = {
  life_science: '#2fb7a5',
  fluid_physics: '#2f9fca',
  material: '#c58a2b',
  combustion: '#c65a3a',
  earth_observe: '#4caa65',
  bio: '#8765c7',
}

const statusText: Record<RunState, string> = {
  running: '运行中',
  waiting: '等待',
  error: '异常',
  completed: '完成',
  idle: '待机',
}

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

function getActiveStep(module: LabModule, currentStepId?: string, currentStepName?: string, dagSteps?: DagStep[]) {
  const steps = dagSteps ?? module.dagSteps ?? []
  const looseModule = module as LabModule & { currentStep?: string; currentStepName?: string }
  if (currentStepName) return currentStepName
  if (currentStepId) return steps.find((step) => step.id === currentStepId)?.name ?? module.currentTask
  return (
    steps.find((step) => step.status === 'running')?.name ??
    steps.find((step) => step.status === 'waiting_resource')?.name ??
    steps.find((step) => step.isActive)?.name ??
    looseModule.currentStepName ??
    looseModule.currentStep ??
    module.currentTask ??
    steps.find((step) => step.status === 'error')?.name ??
    ''
  )
}

function inferRunState(module: LabModule, activeStepName?: string): RunState {
  const text = `${activeStepName ?? ''} ${module.currentTask ?? ''}`.toLowerCase()
  if (module.status === 'error' || /异常|中断|失败|拒绝|error/.test(text)) return 'error'
  if ((module.dagSteps ?? []).some((step) => step.status === 'waiting_resource')) return 'waiting'
  if (module.status === 'running' || (module.dagSteps ?? []).some((step) => step.status === 'running')) return 'running'
  if (module.status === 'completed') return 'completed'
  return 'idle'
}

export function getActiveInstrument(module: LabModule, currentStepName?: string): ActiveInstrumentInfo {
  const status = inferRunState(module, currentStepName)
  const text = `${module.name} ${module.currentTask ?? ''} ${currentStepName ?? ''}`.toLowerCase()

  if (module.moduleType === 'life_science') {
    if (/染色|成像|显微|荧光|分析/.test(text)) return { instrument: 'microscope', label: '显微成像模块', status }
    if (/接种|移液|配制|培养基/.test(text)) return { instrument: 'pipette', label: '移液机械臂', status }
    if (/co₂|co2|预热|培养|复苏|细胞/.test(text)) return { instrument: 'incubator', label: 'CO₂培养箱', status }
    return { instrument: 'co2-sensor', label: 'CO₂/温湿度传感器', status }
  }

  if (module.moduleType === 'fluid_physics') {
    if (/高速摄像|摄像|相机/.test(text)) return { instrument: 'camera', label: '高速摄像机', status }
    if (/注入|泵|液相/.test(text)) return { instrument: 'syringe-pump', label: '注射泵与管路', status }
    if (/液滴|流体|界面|芯片|毛细|接触角/.test(text)) return { instrument: 'fluid-chip', label: '微流控芯片', status }
    return { instrument: 'flow-sensor', label: '压力/流量传感器', status }
  }

  if (module.moduleType === 'material') {
    if (/冷却|回路|水/.test(text)) return { instrument: 'cooling-loop', label: '冷却回路', status }
    if (/加热|热台|升温|保温|热|退火|熔炼/.test(text)) return { instrument: 'heater', label: '小型加热炉', status }
    if (/样品|表征|xrd|结构|观察|性能/.test(text)) return { instrument: 'sample-stage', label: '样品夹具', status }
    return { instrument: 'thermal-probe', label: '热电偶探头', status }
  }

  if (module.moduleType === 'combustion') {
    if (/图像|高速摄像|摄像|分析/.test(text)) return { instrument: 'camera', label: '高速摄像机', status }
    if (/点火/.test(text)) return { instrument: 'igniter', label: '点火器', status }
    if (/燃料|液滴|喷嘴/.test(text)) return { instrument: 'nozzle', label: '喷嘴/液滴悬挂', status }
    if (/燃烧|火焰/.test(text)) return { instrument: 'combustion-chamber', label: '透明燃烧室', status }
    return { instrument: 'pressure-sensor', label: '温压传感器', status }
  }

  if (module.moduleType === 'earth_observe') {
    if (/姿态|云台/.test(text)) return { instrument: 'gimbal', label: '姿态调节云台', status }
    if (/分析|下传|数据/.test(text)) return { instrument: 'data-unit', label: '数据处理单元', status }
    if (/光谱|标定|载荷/.test(text)) return { instrument: 'spectrometer', label: '光谱仪模块', status }
    if (/可见|近红外|成像|遥感|观测/.test(text)) return { instrument: 'telescope', label: '光学载荷镜头', status }
    return { instrument: 'spectrometer', label: '光谱仪模块', status }
  }

  if (module.moduleType === 'bio') {
    if (module.status === 'error' || /sds-page 电泳缓冲液分离|电泳|sds|page|缓冲液|凝胶|分离/.test(text)) {
      return { instrument: 'electrophoresis', label: 'SDS-PAGE电泳槽', status }
    }
    if (/蛋白|样品|筛选|试剂|离心/.test(text)) return { instrument: 'sample-rack', label: '样品架', status }
    return { instrument: 'buffer-sensor', label: '缓冲液液位传感器', status }
  }

  return { instrument: 'status-screen', label: '舱体监控屏', status }
}

function activeColor(runState: RunState, accent: string) {
  if (runState === 'error') return '#ef6666'
  if (runState === 'waiting') return '#eabf5a'
  if (runState === 'completed') return '#64a8e8'
  if (runState === 'running') return '#54d3bd'
  return accent
}

function isActive(active: ActiveInstrumentInfo, instrument: string) {
  return active.instrument === instrument
}

function InstrumentMaterial({
  color,
  active,
  runState,
  opacity = 1,
  metalness = 0.14,
  roughness = 0.55,
}: {
  color: string
  active?: boolean
  runState: RunState
  opacity?: number
  metalness?: number
  roughness?: number
}) {
  const glow = active ? activeColor(runState, color) : '#000000'
  return (
    <meshStandardMaterial
      color={active ? activeColor(runState, color) : color}
      roughness={roughness}
      metalness={metalness}
      transparent={opacity < 1}
      opacity={opacity}
      emissive={glow}
      emissiveIntensity={active ? 0.22 : 0.015}
    />
  )
}

function PulseMarker({ active, runState, position }: { active: boolean; runState: RunState; position: [number, number, number] }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = active ? 1 + Math.sin(clock.getElapsedTime() * 3.1) * 0.14 : 1
    ref.current.scale.setScalar(s)
  })
  if (!active) return null
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.18, 0.01, 8, 42]} />
      <meshStandardMaterial color={activeColor(runState, '#54d3bd')} emissive={activeColor(runState, '#54d3bd')} emissiveIntensity={0.5} transparent opacity={0.7} />
    </mesh>
  )
}

function StatusLight({ active, runState, position }: { active: boolean; runState: RunState; position: [number, number, number] }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const v = active ? 0.75 + Math.sin(clock.getElapsedTime() * 4.4) * 0.25 : 0.45
    ref.current.scale.setScalar(v)
  })
  const color = activeColor(runState, '#54d3bd')
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.035, 14, 10]} />
      <meshStandardMaterial color={active ? color : '#6b7280'} emissive={active ? color : '#111827'} emissiveIntensity={active ? 0.75 : 0.12} />
    </mesh>
  )
}

function PipeLine({ points, color = '#7dd3fc', active = false, runState }: { points: [number, number, number][]; color?: string; active?: boolean; runState: RunState }) {
  return (
    <Line
      points={points}
      color={active ? activeColor(runState, color) : color}
      lineWidth={active ? 2.4 : 1.35}
      transparent
      opacity={active ? 0.95 : 0.54}
    />
  )
}

function LabelTag({ text, position, active }: { text: string; position: [number, number, number]; active: boolean }) {
  if (!active) return null
  return (
    <Html position={position} center distanceFactor={7.5}>
      <div className="whitespace-nowrap rounded border border-cyan-300/30 bg-slate-950/80 px-2 py-1 text-[10px] font-semibold text-cyan-100 shadow-lg shadow-black/30">
        {text}
      </div>
    </Html>
  )
}

function StatusScreen({ module, active, currentStepName, compact }: { module: LabModule; active: ActiveInstrumentInfo; currentStepName: string; compact: boolean }) {
  if (compact) return null
  return (
    <Html position={[0.76, -0.1, 0.57]} rotation={[0, -0.28, 0]} transform distanceFactor={6.8}>
      <div className="w-[116px] rounded border border-cyan-300/30 bg-[#07111c] px-2 py-1.5 font-mono text-[8px] leading-tight text-cyan-100 shadow-lg shadow-cyan-950/40">
        <div className="truncate text-[7px] text-cyan-300/70">{module.name}</div>
        <div className="mt-0.5 truncate text-white">{currentStepName || module.currentTask}</div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="truncate">{active.label}</span>
          <span style={{ color: activeColor(active.status, accentByType[module.moduleType]) }}>{statusText[active.status]}</span>
        </div>
      </div>
    </Html>
  )
}

function WorkSurface({ compact }: { compact: boolean }) {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.78, 0]}>
        <boxGeometry args={[2.42, 0.12, 1.24]} />
        <meshStandardMaterial color="#596575" roughness={0.66} metalness={0.18} />
      </mesh>
      <mesh receiveShadow position={[0, -0.68, 0.04]}>
        <boxGeometry args={[2.02, 0.055, 0.88]} />
        <meshStandardMaterial color="#d2d6d7" roughness={0.72} metalness={0.05} />
      </mesh>
      {!compact && (
        <>
          {[-0.36, 0, 0.36].map((x) => (
            <Line key={`gx-${x}`} points={[[x, -0.646, -0.4], [x, -0.646, 0.44]]} color="#94a3b8" lineWidth={0.55} transparent opacity={0.24} />
          ))}
          {[-0.2, 0.2].map((z) => (
            <Line key={`gz-${z}`} points={[[-0.82, -0.644, z], [0.9, -0.644, z]]} color="#94a3b8" lineWidth={0.55} transparent opacity={0.24} />
          ))}
        </>
      )}
    </group>
  )
}

function TransparentChamber({ compact, accent }: { compact: boolean; accent: string }) {
  const posts: [number, number, number][] = [
    [-1.12, -0.04, -0.58],
    [1.12, -0.04, -0.58],
    [-1.12, -0.04, 0.58],
    [1.12, -0.04, 0.58],
  ]
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, -0.02, 0]}>
        <boxGeometry args={[2.28, 1.42, 1.16]} />
        <meshPhysicalMaterial color="#b6d6ea" transparent opacity={compact ? 0.11 : 0.17} roughness={0.12} metalness={0.02} transmission={0.18} thickness={0.22} />
        <Edges color="#8ea3b7" />
      </mesh>
      <mesh position={[0, -0.02, 0.585]}>
        <boxGeometry args={[1.08, 1.28, 0.012]} />
        <meshStandardMaterial color="#c8e4f3" transparent opacity={0.08} roughness={0.18} />
        <Edges color="#9fb1c3" />
      </mesh>
      <Line points={[[0, -0.66, 0.596], [0, 0.62, 0.596]]} color="#cbd5e1" lineWidth={1.15} transparent opacity={0.48} />
      {posts.map((position, i) => (
        <mesh key={i} castShadow position={position}>
          <boxGeometry args={[0.045, 1.5, 0.045]} />
          <meshStandardMaterial color="#6f7d8d" roughness={0.4} metalness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.42, 0.06, 1.26]} />
        <meshStandardMaterial color="#7b8795" roughness={0.45} metalness={0.45} />
      </mesh>
      <mesh position={[-0.92, -0.58, 0.62]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.36, 10]} />
        <meshStandardMaterial color={accent} roughness={0.48} metalness={0.35} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0, 0.44, -0.61]}>
        <boxGeometry args={[2.06, 0.46, 0.035]} />
        <meshStandardMaterial color="#758395" roughness={0.58} metalness={0.32} />
      </mesh>
      <WorkSurface compact={compact} />
    </group>
  )
}

function SensorProbe({ active, runState, position = [0.88, -0.42, 0.22] as [number, number, number], label = '传感器' }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.017, 0.017, 0.34, 8]} />
        <InstrumentMaterial color="#7c8797" active={active} runState={runState} metalness={0.42} />
      </mesh>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[0.15, 0.09, 0.1]} />
        <InstrumentMaterial color="#8ba5b8" active={active} runState={runState} />
      </mesh>
      <StatusLight active={active} runState={runState} position={[0.055, 0.39, 0.052]} />
      <LabelTag text={label} position={[0, 0.55, 0]} active={active} />
    </group>
  )
}

function CameraUnit({ active, runState, position, rotation = [0, -0.55, 0] as [number, number, number], label = '高速摄像机' }: { active: boolean; runState: RunState; position: [number, number, number]; rotation?: [number, number, number]; label?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.18, 0.2]} />
        <InstrumentMaterial color="#4b5a6b" active={active} runState={runState} metalness={0.24} />
        {active && <Edges color={activeColor(runState, '#54d3bd')} />}
      </mesh>
      <mesh castShadow position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
        <meshStandardMaterial color="#707b89" roughness={0.5} metalness={0.35} />
      </mesh>
      <mesh castShadow position={[0, -0.32, 0]}>
        <boxGeometry args={[0.2, 0.045, 0.18]} />
        <meshStandardMaterial color="#7c8797" roughness={0.55} metalness={0.24} />
      </mesh>
      <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.072, 0.098, 0.16, 20]} />
        <InstrumentMaterial color="#1f2937" active={active} runState={runState} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.255]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.058, 0.058, 0.014, 20]} />
        <meshStandardMaterial color="#9fd5f3" transparent opacity={0.5} emissive="#123047" emissiveIntensity={0.12} />
      </mesh>
      <StatusLight active={active} runState={runState} position={[-0.1, 0.08, 0.11]} />
      <PulseMarker active={active} runState={runState} position={[0, 0.02, 0.34]} />
      <LabelTag text={label} position={[0, 0.32, 0.18]} active={active} />
    </group>
  )
}

function LifeScienceInterior({ active }: { active: ActiveInstrumentInfo }) {
  const incubatorActive = isActive(active, 'incubator')
  const pipetteActive = isActive(active, 'pipette')
  const microscopeActive = isActive(active, 'microscope')
  return (
    <group>
      <group position={[-0.63, -0.38, -0.08]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.42, 0.36]} />
          <InstrumentMaterial color="#596779" active={incubatorActive} runState={active.status} opacity={0.92} />
          <Edges color={incubatorActive ? activeColor(active.status, '#54d3bd') : '#8895a5'} />
        </mesh>
        <mesh position={[0, 0.02, 0.19]}>
          <boxGeometry args={[0.34, 0.24, 0.018]} />
          <meshPhysicalMaterial color="#bdeff1" transparent opacity={0.35} roughness={0.16} transmission={0.1} />
        </mesh>
        {[-0.08, 0.06].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.36, 0.012, 0.25]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.16} />
          </mesh>
        ))}
        <StatusLight active={incubatorActive} runState={active.status} position={[0.19, 0.14, 0.2]} />
        <LabelTag text="CO₂培养箱" position={[0, 0.38, 0.1]} active={incubatorActive} />
      </group>
      <group position={[-0.05, -0.62, 0.18]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[-0.2 + (i % 3) * 0.15, 0.02, Math.floor(i / 3) * 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.048, 0.018, 18]} />
            <meshPhysicalMaterial color={pipetteActive ? '#9df0df' : '#c4e4df'} transparent opacity={0.58} roughness={0.26} />
          </mesh>
        ))}
        <mesh position={[0.03, 0.025, 0.06]}>
          <boxGeometry args={[0.5, 0.025, 0.27]} />
          <meshStandardMaterial color="#eef2f3" transparent opacity={0.42} />
        </mesh>
      </group>
      <group position={[0.22, -0.47, 0.06]} rotation={[0, 0, -0.25]}>
        <mesh castShadow position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.025, 0.034, 0.42, 10]} />
          <InstrumentMaterial color="#9aa8b8" active={pipetteActive} runState={active.status} />
        </mesh>
        <mesh castShadow position={[0.08, 0.08, 0]}>
          <boxGeometry args={[0.22, 0.05, 0.06]} />
          <InstrumentMaterial color="#7b8797" active={pipetteActive} runState={active.status} />
        </mesh>
        <mesh position={[0.18, -0.08, 0]}>
          <cylinderGeometry args={[0.011, 0.017, 0.22, 8]} />
          <InstrumentMaterial color="#62b8ac" active={pipetteActive} runState={active.status} />
        </mesh>
        <PulseMarker active={pipetteActive} runState={active.status} position={[0.16, 0.02, 0]} />
        <LabelTag text="移液机械臂" position={[0.1, 0.5, 0]} active={pipetteActive} />
      </group>
      <group position={[0.65, -0.46, -0.14]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.08, 0.28]} />
          <InstrumentMaterial color="#4c5c70" active={microscopeActive} runState={active.status} />
        </mesh>
        <mesh castShadow position={[-0.08, 0.19, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.33, 12]} />
          <InstrumentMaterial color="#8b96a7" active={microscopeActive} runState={active.status} metalness={0.28} />
        </mesh>
        <mesh castShadow position={[0.03, 0.28, 0]}>
          <boxGeometry args={[0.2, 0.08, 0.13]} />
          <InstrumentMaterial color="#526173" active={microscopeActive} runState={active.status} />
        </mesh>
        <mesh position={[0.04, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.065, 0.18, 18]} />
          <InstrumentMaterial color="#263244" active={microscopeActive} runState={active.status} />
        </mesh>
        <mesh position={[0.04, 0.04, 0.02]}>
          <boxGeometry args={[0.18, 0.018, 0.14]} />
          <meshStandardMaterial color="#dce7eb" roughness={0.34} metalness={0.12} />
        </mesh>
        <PulseMarker active={microscopeActive} runState={active.status} position={[0.04, 0.34, 0]} />
        <LabelTag text="显微成像模块" position={[0.04, 0.52, 0]} active={microscopeActive} />
      </group>
      <PipeLine points={[[-0.38, -0.16, 0.08], [0.18, -0.26, 0.18], [0.52, -0.36, 0.08]]} color="#8ee6d6" active={pipetteActive || incubatorActive} runState={active.status} />
      <SensorProbe active={isActive(active, 'co2-sensor') || incubatorActive} runState={active.status} label="CO₂ / 温湿度" />
    </group>
  )
}

function FluidPhysicsInterior({ active }: { active: ActiveInstrumentInfo }) {
  const pumpActive = isActive(active, 'syringe-pump')
  const chipActive = isActive(active, 'fluid-chip')
  const cameraActive = isActive(active, 'camera')
  return (
    <group>
      <group position={[-0.74, -0.49, 0.08]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.2, 0.26]} />
          <InstrumentMaterial color="#5c6877" active={pumpActive} runState={active.status} />
          {pumpActive && <Edges color={activeColor(active.status, '#54d3bd')} />}
        </mesh>
        <mesh position={[0.1, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.34, 14]} />
          <meshPhysicalMaterial color="#d7ecf1" transparent opacity={0.52} roughness={0.2} />
        </mesh>
        <mesh position={[0.25, 0.04, 0]}>
          <boxGeometry args={[0.08, 0.08, 0.16]} />
          <InstrumentMaterial color="#a9b6c5" active={pumpActive} runState={active.status} />
        </mesh>
        <mesh position={[-0.13, 0.04, 0]}>
          <boxGeometry args={[0.07, 0.11, 0.2]} />
          <InstrumentMaterial color="#748193" active={pumpActive} runState={active.status} />
        </mesh>
        <StatusLight active={pumpActive} runState={active.status} position={[-0.16, 0.13, 0.12]} />
        <LabelTag text="注射泵" position={[0, 0.34, 0]} active={pumpActive} />
      </group>
      <group position={[0, -0.56, 0.12]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.66, 0.045, 0.34]} />
          <meshPhysicalMaterial color="#9addea" transparent opacity={0.3} roughness={0.16} transmission={0.16} />
          <Edges color={chipActive ? activeColor(active.status, '#54d3bd') : '#73a9b6'} />
        </mesh>
        <Line points={[[-0.26, 0.04, -0.08], [-0.08, 0.045, -0.08], [0, 0.045, 0.06], [0.22, 0.045, 0.06]]} color={chipActive ? activeColor(active.status, '#7dd3fc') : '#7dd3fc'} lineWidth={2} transparent opacity={0.78} />
        {[[-0.03, 0.065, 0.02], [0.08, 0.065, 0.06], [0.18, 0.065, 0.06]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <sphereGeometry args={[0.025, 12, 8]} />
            <InstrumentMaterial color="#2f9fca" active={chipActive} runState={active.status} />
          </mesh>
        ))}
        <PulseMarker active={chipActive} runState={active.status} position={[0.02, 0.18, 0.04]} />
        <LabelTag text="微流控芯片 / 液滴" position={[0, 0.32, 0]} active={chipActive} />
      </group>
      <group position={[-0.43, -0.52, -0.28]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.16, 18]} />
          <meshPhysicalMaterial color="#8fd7e2" transparent opacity={0.36} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 18]} />
          <meshStandardMaterial color="#45b7cf" transparent opacity={0.44} />
        </mesh>
      </group>
      <PipeLine points={[[-0.56, -0.47, 0.08], [-0.3, -0.46, 0.15], [-0.18, -0.53, 0.16]]} color="#69d7e8" active={pumpActive || chipActive} runState={active.status} />
      <PipeLine points={[[0.32, -0.52, 0.16], [0.52, -0.42, 0.06], [0.72, -0.38, -0.08]]} color="#69d7e8" active={chipActive} runState={active.status} />
      <CameraUnit active={cameraActive} runState={active.status} position={[0.72, -0.34, -0.25]} rotation={[0, -0.68, 0]} />
      <SensorProbe active={isActive(active, 'flow-sensor') || pumpActive} runState={active.status} position={[0.82, -0.48, 0.25]} label="压力 / 流量" />
    </group>
  )
}

function MaterialInterior({ active }: { active: ActiveInstrumentInfo }) {
  const heaterActive = isActive(active, 'heater')
  const coolingActive = isActive(active, 'cooling-loop')
  const sampleActive = isActive(active, 'sample-stage')
  return (
    <group>
      <group position={[-0.54, -0.42, 0.02]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.34, 24]} />
          <InstrumentMaterial color="#65513c" active={heaterActive} runState={active.status} metalness={0.22} />
          <Edges color={heaterActive ? activeColor(active.status, '#d29a4d') : '#8d7963'} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 24]} />
          <InstrumentMaterial color="#c58a2b" active={heaterActive} runState={active.status} opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.03, 0.22]}>
          <boxGeometry args={[0.22, 0.12, 0.024]} />
          <meshStandardMaterial color="#f2b24a" emissive="#c58a2b" emissiveIntensity={heaterActive ? 0.28 : 0.08} transparent opacity={0.82} />
        </mesh>
        <StatusLight active={heaterActive} runState={active.status} position={[0.17, 0.08, 0.18]} />
        <PulseMarker active={heaterActive} runState={active.status} position={[0, 0.33, 0]} />
        <LabelTag text="小型加热炉" position={[0, 0.5, 0]} active={heaterActive} />
      </group>
      <group position={[0.04, -0.55, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.46, 0.055, 0.3]} />
          <InstrumentMaterial color="#6b7280" active={sampleActive} runState={active.status} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.2, 0.09, 0.16]} />
          <InstrumentMaterial color="#9a7a48" active={sampleActive} runState={active.status} />
        </mesh>
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]}>
            <boxGeometry args={[0.05, 0.16, 0.04]} />
            <InstrumentMaterial color="#9aa3af" active={sampleActive} runState={active.status} />
          </mesh>
        ))}
        <Line points={[[-0.24, 0.19, 0], [0.24, 0.19, 0]]} color={sampleActive ? activeColor(active.status, '#d29a4d') : '#9ca3af'} lineWidth={1.3} />
        <PulseMarker active={sampleActive} runState={active.status} position={[0, 0.27, 0]} />
        <LabelTag text="样品夹具" position={[0, 0.42, 0]} active={sampleActive} />
      </group>
      <group position={[0.54, -0.48, 0.2]}>
        <mesh castShadow position={[0.17, 0.02, 0]}>
          <boxGeometry args={[0.16, 0.22, 0.1]} />
          <InstrumentMaterial color="#5b6d7a" active={coolingActive} runState={active.status} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <Line key={i} points={[[-0.16, -0.06 + i * 0.06, 0], [0.1, -0.06 + i * 0.06, 0]]} color="#77c9d3" lineWidth={1.15} transparent opacity={0.72} />
        ))}
        <mesh position={[0.25, 0.15, 0]}>
          <boxGeometry args={[0.18, 0.04, 0.18]} />
          <InstrumentMaterial color="#65a9b2" active={coolingActive} runState={active.status} />
        </mesh>
        <PulseMarker active={coolingActive} runState={active.status} position={[0.04, 0.22, 0]} />
        <LabelTag text="冷却回路" position={[0.06, 0.42, 0]} active={coolingActive} />
      </group>
      <PipeLine points={[[0.24, -0.46, 0.12], [0.42, -0.32, 0.22], [0.72, -0.44, 0.2], [0.34, -0.62, 0.12]]} color="#77c9d3" active={coolingActive} runState={active.status} />
      <CameraUnit active={isActive(active, 'camera')} runState={active.status} position={[0.72, -0.31, -0.22]} rotation={[0, -0.52, 0]} label="观察相机" />
      <SensorProbe active={isActive(active, 'thermal-probe') || heaterActive} runState={active.status} position={[0.84, -0.48, 0.23]} label="热电偶探头" />
    </group>
  )
}

function CombustionInterior({ active }: { active: ActiveInstrumentInfo }) {
  const chamberActive = isActive(active, 'combustion-chamber') || active.status === 'error'
  const nozzleActive = isActive(active, 'nozzle')
  const igniterActive = isActive(active, 'igniter')
  const cameraActive = isActive(active, 'camera')
  return (
    <group>
      <group position={[-0.2, -0.4, 0.02]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.5, 28]} />
          <meshPhysicalMaterial color="#d4e9f5" transparent opacity={0.22} roughness={0.12} transmission={0.12} />
          <Edges color={chamberActive ? activeColor(active.status, '#c65a3a') : '#8ea0b3'} />
        </mesh>
        <mesh position={[0, -0.01, 0]}>
          <sphereGeometry args={[0.07, 18, 12]} />
          <meshStandardMaterial color="#f1a45f" emissive="#c65a3a" emissiveIntensity={chamberActive ? 0.38 : 0.08} transparent opacity={0.48} />
        </mesh>
        <mesh position={[0, -0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.05, 0.3, 14]} />
          <InstrumentMaterial color="#c65a3a" active={nozzleActive} runState={active.status} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <InstrumentMaterial color="#f3b66a" active={nozzleActive || chamberActive} runState={active.status} />
        </mesh>
        <mesh position={[0.18, 0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.011, 0.011, 0.32, 8]} />
          <InstrumentMaterial color="#d1d5db" active={igniterActive} runState={active.status} metalness={0.5} />
        </mesh>
        <mesh position={[0.08, 0.0, 0.08]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <InstrumentMaterial color="#e9edf3" active={igniterActive} runState={active.status} />
        </mesh>
        <PulseMarker active={chamberActive || nozzleActive || igniterActive} runState={active.status} position={[0, 0.34, 0]} />
        <LabelTag text={igniterActive ? '点火器' : nozzleActive ? '喷嘴 / 液滴' : '透明燃烧室'} position={[0, 0.52, 0]} active={chamberActive || nozzleActive || igniterActive} />
      </group>
      <CameraUnit active={cameraActive} runState={active.status} position={[0.55, -0.32, -0.25]} rotation={[0, -0.65, 0]} />
      <group position={[0.78, -0.38, 0.22]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.28, 12]} />
          <InstrumentMaterial color="#8b97a8" active={isActive(active, 'pressure-sensor')} runState={active.status} />
        </mesh>
        <mesh position={[0.15, 0, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <InstrumentMaterial color="#748193" active={isActive(active, 'pressure-sensor')} runState={active.status} />
        </mesh>
      </group>
      <PipeLine points={[[-0.2, -0.15, 0.28], [0.2, -0.08, 0.42], [0.78, -0.28, 0.3]]} color="#a8b4c4" active={isActive(active, 'pressure-sensor') || active.status === 'error'} runState={active.status} />
      <SensorProbe active={isActive(active, 'pressure-sensor')} runState={active.status} position={[0.9, -0.48, 0.02]} label="温度 / 压力" />
    </group>
  )
}

function EarthObserveInterior({ active }: { active: ActiveInstrumentInfo }) {
  const telescopeActive = isActive(active, 'telescope')
  const spectrometerActive = isActive(active, 'spectrometer')
  const gimbalActive = isActive(active, 'gimbal')
  const dataActive = isActive(active, 'data-unit')
  return (
    <group>
      <group position={[-0.48, -0.4, 0]} rotation={[0, 0.08, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.24, 0.42, 24]} />
          <InstrumentMaterial color="#40556a" active={telescopeActive} runState={active.status} metalness={0.22} />
          {telescopeActive && <Edges color={activeColor(active.status, '#54d3bd')} />}
        </mesh>
        <mesh position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} />
          <meshPhysicalMaterial color="#9bc1d4" transparent opacity={0.52} roughness={0.12} transmission={0.1} />
        </mesh>
        <mesh position={[-0.08, -0.2, 0]}>
          <boxGeometry args={[0.2, 0.05, 0.22]} />
          <InstrumentMaterial color="#7b8797" active={gimbalActive || telescopeActive} runState={active.status} />
        </mesh>
        <PulseMarker active={telescopeActive} runState={active.status} position={[0.16, 0.18, 0]} />
        <LabelTag text="光学载荷镜头" position={[0, 0.35, 0]} active={telescopeActive} />
      </group>
      <group position={[0.09, -0.49, 0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.2, 0.32]} />
          <InstrumentMaterial color="#31495a" active={spectrometerActive} runState={active.status} />
          {spectrometerActive && <Edges color={activeColor(active.status, '#54d3bd')} />}
        </mesh>
        <mesh position={[0, 0.03, 0.18]}>
          <boxGeometry args={[0.28, 0.025, 0.012]} />
          <meshStandardMaterial color="#b4f1ff" emissive="#2f9fca" emissiveIntensity={0.15} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-0.15 + i * 0.1, 0.13, 0.18]}>
            <boxGeometry args={[0.055, 0.035, 0.012]} />
            <InstrumentMaterial color={i === 1 ? '#4caa65' : '#8aa4bd'} active={spectrometerActive || telescopeActive} runState={active.status} />
          </mesh>
        ))}
        <Line points={[[-0.22, 0.12, 0.02], [0.22, 0.12, 0.14]]} color="#86efac" lineWidth={1.2} transparent opacity={0.62} />
        <PulseMarker active={spectrometerActive} runState={active.status} position={[0, 0.25, 0]} />
        <LabelTag text="光谱仪模块" position={[0, 0.42, 0]} active={spectrometerActive} />
      </group>
      <group position={[0.58, -0.55, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.08, 20]} />
          <InstrumentMaterial color="#5d6b7c" active={gimbalActive} runState={active.status} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.3, 0.13, 0.22]} />
          <InstrumentMaterial color="#415364" active={gimbalActive || dataActive} runState={active.status} />
        </mesh>
        <mesh position={[0.01, 0.25, 0.08]}>
          <boxGeometry args={[0.2, 0.07, 0.05]} />
          <InstrumentMaterial color="#35495b" active={dataActive} runState={active.status} />
        </mesh>
        <StatusLight active={gimbalActive || dataActive} runState={active.status} position={[0.12, 0.31, 0.11]} />
        <LabelTag text={gimbalActive ? '姿态调节云台' : '数据处理单元'} position={[0, 0.48, 0]} active={gimbalActive || dataActive} />
      </group>
      <PipeLine points={[[-0.22, -0.4, 0.02], [0.02, -0.42, 0.05], [0.42, -0.44, 0.04]]} color="#86efac" active={spectrometerActive || dataActive} runState={active.status} />
    </group>
  )
}

function BioTechInterior({ active }: { active: ActiveInstrumentInfo }) {
  const electrophoresisActive = isActive(active, 'electrophoresis') || active.status === 'error'
  const rackActive = isActive(active, 'sample-rack')
  const sensorActive = isActive(active, 'buffer-sensor')
  return (
    <group>
      <group position={[-0.4, -0.53, 0.08]}>
        <mesh castShadow>
          <boxGeometry args={[0.58, 0.18, 0.36]} />
          <meshPhysicalMaterial color="#9fc2d8" transparent opacity={0.34} roughness={0.18} transmission={0.12} />
          <Edges color={electrophoresisActive ? activeColor(active.status, '#ef6666') : '#90a4b8'} />
        </mesh>
        <mesh position={[0, 0.015, 0.02]}>
          <boxGeometry args={[0.42, 0.045, 0.24]} />
          <InstrumentMaterial color={active.status === 'error' ? '#ef6666' : '#8765c7'} active={electrophoresisActive} runState={active.status} opacity={0.8} />
        </mesh>
        {[-0.16, -0.08, 0, 0.08, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.075, 0.17]}>
            <boxGeometry args={[0.018, 0.08, 0.016]} />
            <InstrumentMaterial color={x < 0 ? '#ef4444' : '#111827'} active={electrophoresisActive} runState={active.status} />
          </mesh>
        ))}
        <mesh position={[-0.25, 0.08, -0.1]}>
          <sphereGeometry args={[0.025, 10, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.25, 0.08, -0.1]}>
          <sphereGeometry args={[0.025, 10, 8]} />
          <meshStandardMaterial color="#111827" emissive="#3b82f6" emissiveIntensity={0.2} />
        </mesh>
        <PulseMarker active={electrophoresisActive} runState={active.status} position={[0, 0.27, 0]} />
        <LabelTag text="SDS-PAGE电泳槽" position={[0, 0.45, 0]} active={electrophoresisActive} />
      </group>
      <group position={[0.28, -0.55, 0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.08, 0.28]} />
          <InstrumentMaterial color="#4b5563" active={rackActive} runState={active.status} />
        </mesh>
        {[-0.14, -0.04, 0.06, 0.16].map((x, i) => (
          <mesh key={x} position={[x, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.031, 0.17, 12]} />
            <InstrumentMaterial color={i % 2 ? '#b8a8df' : '#a5d8ff'} active={rackActive} runState={active.status} opacity={0.9} />
          </mesh>
        ))}
        <mesh position={[0.08, 0.19, -0.17]} rotation={[0, 0, -0.35]}>
          <cylinderGeometry args={[0.018, 0.024, 0.28, 10]} />
          <InstrumentMaterial color="#d6d3d1" active={rackActive} runState={active.status} />
        </mesh>
        <PulseMarker active={rackActive} runState={active.status} position={[0, 0.28, 0]} />
        <LabelTag text="样品架 / 移液枪" position={[0, 0.43, 0]} active={rackActive} />
      </group>
      <group position={[0.73, -0.48, -0.08]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.2, 0.22]} />
          <InstrumentMaterial color="#536173" active={electrophoresisActive} runState={active.status} />
        </mesh>
        <mesh position={[0, 0.01, 0.12]}>
          <boxGeometry args={[0.18, 0.06, 0.012]} />
          <meshStandardMaterial color="#07111c" emissive={activeColor(active.status, '#8765c7')} emissiveIntensity={electrophoresisActive ? 0.28 : 0.08} />
        </mesh>
        <StatusLight active={electrophoresisActive} runState={active.status} position={[0.12, 0.08, 0.12]} />
      </group>
      <PipeLine points={[[-0.64, -0.46, -0.02], [-0.54, -0.22, -0.18], [0.63, -0.35, -0.05]]} color="#ef4444" active={electrophoresisActive} runState={active.status} />
      <PipeLine points={[[-0.18, -0.46, -0.02], [0.12, -0.28, -0.18], [0.63, -0.36, -0.04]]} color="#111827" active={electrophoresisActive} runState={active.status} />
      <SensorProbe active={sensorActive || electrophoresisActive} runState={active.status} position={[0.86, -0.49, 0.25]} label="缓冲液液位" />
    </group>
  )
}

function ModuleInterior({ module, active }: { module: LabModule; active: ActiveInstrumentInfo }) {
  if (module.moduleType === 'life_science') return <LifeScienceInterior active={active} />
  if (module.moduleType === 'fluid_physics') return <FluidPhysicsInterior active={active} />
  if (module.moduleType === 'material') return <MaterialInterior active={active} />
  if (module.moduleType === 'combustion') return <CombustionInterior active={active} />
  if (module.moduleType === 'earth_observe') return <EarthObserveInterior active={active} />
  if (module.moduleType === 'bio') return <BioTechInterior active={active} />
  return <SensorProbe active runState={active.status} />
}

function TransparentLabModel({
  module,
  compact = false,
  autoRotate = false,
  active,
  currentStepName,
}: {
  module: LabModule
  compact?: boolean
  autoRotate?: boolean
  active: ActiveInstrumentInfo
  currentStepName: string
}) {
  const groupRef = useRef<Group>(null)
  const accent = accentByType[module.moduleType]

  useFrame((_, delta) => {
    if (!groupRef.current || (!autoRotate && !compact)) return
    groupRef.current.rotation.y += delta * (compact ? 0.14 : 0.08)
  })

  return (
    <group ref={groupRef} rotation={[0.08, compact ? -0.46 : -0.34, 0]} scale={compact ? 0.9 : 1.03}>
      <TransparentChamber compact={compact} accent={accent} />
      <ModuleInterior module={module} active={active} />
      <StatusScreen module={module} active={active} currentStepName={currentStepName} compact={compact} />
      <StatusLight active={active.status !== 'idle'} runState={active.status} position={[0.98, 0.58, 0.58]} />
      {!compact && (
        <Html position={[-0.82, 0.58, 0.58]} center distanceFactor={7}>
          <div className="whitespace-nowrap rounded border border-white/10 bg-slate-950/75 px-2 py-1 text-[9px] text-slate-200">
            当前步骤 · {currentStepName || '待机'}
          </div>
        </Html>
      )}
    </group>
  )
}

function LabFallback({ module, active }: { module: LabModule; active: ActiveInstrumentInfo }) {
  const accent = accentByType[module.moduleType]
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded border border-white/10 bg-black/15">
      <svg viewBox="0 0 180 130" className="h-[92%] max-h-full">
        <rect x="18" y="16" width="144" height="86" rx="8" fill="#b6d6ea" fillOpacity="0.14" stroke="#8ea3b7" strokeWidth="2" />
        <rect x="28" y="88" width="124" height="12" rx="2" fill="#596575" />
        <rect x="38" y="50" width="34" height="25" rx="3" fill={active.instrument.includes('incubator') || active.instrument.includes('electrophoresis') ? activeColor(active.status, accent) : '#657386'} fillOpacity="0.75" />
        <circle cx="92" cy="66" r="15" fill={active.instrument.includes('chip') || active.instrument.includes('chamber') ? activeColor(active.status, accent) : '#78aab6'} fillOpacity="0.62" />
        <rect x="115" y="43" width="31" height="24" rx="3" fill={active.instrument.includes('camera') || active.instrument.includes('scope') || active.instrument.includes('telescope') ? activeColor(active.status, accent) : '#405166'} fillOpacity="0.78" />
        <path d="M50 82 C78 66, 112 78, 138 58" fill="none" stroke={accent} strokeWidth="2" strokeOpacity="0.62" />
        <circle cx="150" cy="30" r="4" fill={activeColor(active.status, accent)} />
      </svg>
    </div>
  )
}

export default function LabCabinet3D({
  module,
  compact = false,
  interactive = false,
  autoRotate = compact,
  height = compact ? 132 : 260,
  currentStepId,
  currentStepName,
  dagSteps,
}: LabExperiment3DProps) {
  const style = typeof height === 'number' ? { height: `${height}px` } : { height }
  const activeStepName = getActiveStep(module, currentStepId, currentStepName, dagSteps)
  const active = useMemo(() => getActiveInstrument(module, activeStepName), [module, activeStepName])

  if (!webglAvailable()) {
    return (
      <div style={style}>
        <LabFallback module={module} active={active} />
      </div>
    )
  }

  return (
    <div style={style} className="relative overflow-hidden rounded border border-white/10 bg-slate-950/20">
      <Suspense fallback={<LabFallback module={module} active={active} />}>
        <Canvas
          shadows
          camera={{ position: compact ? [0.15, 0.16, 4.1] : [0.08, 0.04, 3.65], fov: compact ? 32 : 37 }}
          dpr={compact ? [1, 1.15] : [1, 1.7]}
          gl={{ antialias: !compact, alpha: true, powerPreference: compact ? 'low-power' : 'high-performance' }}
        >
          <ambientLight intensity={compact ? 0.88 : 0.72} />
          <directionalLight
            castShadow
            position={[2.6, 3.4, 3.2]}
            intensity={compact ? 1.18 : 1.45}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-2.4, 1.1, -1.8]} intensity={compact ? 0.35 : 0.55} color="#b7d5ff" />
          {!compact && <pointLight position={[-1.7, 1.2, 1.8]} intensity={0.34} color={accentByType[module.moduleType]} />}
          <TransparentLabModel module={module} compact={compact} autoRotate={autoRotate} active={active} currentStepName={activeStepName} />
          <ContactShadows position={[0, -0.91, 0]} opacity={compact ? 0.22 : 0.34} scale={3.2} blur={1.7} far={1.7} />
          {interactive && (
            <OrbitControls
              enableDamping
              enablePan
              enableZoom
              minDistance={2.35}
              maxDistance={5.8}
              target={[0, -0.18, 0]}
            />
          )}
        </Canvas>
      </Suspense>
    </div>
  )
}
