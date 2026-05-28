import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Edges, Html, Line, OrbitControls, RoundedBox } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import type { DagStep, LabModule } from '../../types'
import { AssetModel } from './models/AssetModel'
import { StudioLighting } from './lighting/StudioLighting'
import { GlassMaterial, LiquidMaterial, MetalMaterial, PlasticMaterial, ScreenMaterial, DeviceMaterial, accentByType, activeColor, type RunState } from './materials/pbr'

export interface ActiveInstrumentInfo {
  instrument: string
  label: string
  status: RunState
}

export interface LabModule3DSceneProps {
  module: LabModule
  compact?: boolean
  interactive?: boolean
  autoRotate?: boolean
  height?: number | string
  currentStepId?: string
  currentStepName?: string
  dagSteps?: DagStep[]
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
    if (/co₂|co2|预热|培养|复苏|细胞/.test(text)) return { instrument: 'incubator', label: 'CO2培养箱', status }
    return { instrument: 'co2-sensor', label: 'CO2/温湿度传感器', status }
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
    if (/燃料|液滴|喷嘴/.test(text)) return { instrument: 'nozzle', label: '喷嘴/液滴装置', status }
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
    if (module.status === 'error' || /sds-page 电泳缓冲液分离|电泳|sds|page|缓冲液|凝胶|分离/.test(text)) return { instrument: 'electrophoresis', label: 'SDS-PAGE电泳槽', status }
    if (/蛋白|样品|筛选|试剂|离心/.test(text)) return { instrument: 'sample-rack', label: '样品架', status }
    return { instrument: 'buffer-sensor', label: '缓冲液液位传感器', status }
  }
  return { instrument: 'status-screen', label: '舱体监控屏', status }
}

function isActive(active: ActiveInstrumentInfo, instrument: string) {
  return active.instrument === instrument
}

function StatusLight({ active, runState, position, size = 0.035 }: { active: boolean; runState: RunState; position: [number, number, number]; size?: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.scale.setScalar(active ? 0.9 + Math.sin(clock.getElapsedTime() * 4.2) * 0.08 : 0.75)
  })
  const color = activeColor(runState, '#54d3bd')
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 18, 12]} />
      <meshStandardMaterial color={active ? color : '#536071'} emissive={active ? color : '#111827'} emissiveIntensity={active ? 0.75 : 0.08} />
    </mesh>
  )
}

function ActiveRing({ active, runState, position }: { active: boolean; runState: RunState; position: [number, number, number] }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 2.8) * 0.04)
  })
  if (!active) return null
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.2, 0.008, 10, 60]} />
      <meshStandardMaterial color={activeColor(runState, '#54d3bd')} emissive={activeColor(runState, '#54d3bd')} emissiveIntensity={0.35} transparent opacity={0.62} />
    </mesh>
  )
}

function DeviceTooltip({ text, compact }: { text: string; compact: boolean }) {
  const [hovered, setHovered] = useState(false)
  if (compact) return { bind: {}, tip: null }
  return {
    bind: { onPointerOver: () => setHovered(true), onPointerOut: () => setHovered(false) },
    tip: hovered ? (
      <Html position={[0, 0.46, 0]} center distanceFactor={8}>
        <div className="whitespace-nowrap rounded border border-white/15 bg-slate-950/85 px-1.5 py-0.5 text-[9px] text-slate-200 shadow-lg shadow-black/30">{text}</div>
      </Html>
    ) : null,
  }
}

function Pipe({ points, active, runState, color = '#7dd3fc' }: { points: [number, number, number][]; active?: boolean; runState: RunState; color?: string }) {
  return <Line points={points} color={active ? activeColor(runState, color) : color} lineWidth={active ? 2.2 : 1.15} transparent opacity={active ? 0.9 : 0.44} />
}

function Workbench({ compact }: { compact: boolean }) {
  return (
    <group>
      <RoundedBox receiveShadow position={[0, -0.8, 0]} args={[2.55, 0.12, 1.28]} radius={0.025} smoothness={3}>
        <MetalMaterial color="#77818d" roughness={0.42} />
      </RoundedBox>
      <RoundedBox receiveShadow position={[0, -0.705, 0.03]} args={[2.12, 0.045, 0.92]} radius={0.018} smoothness={3}>
        <meshStandardMaterial color="#d8dddd" roughness={0.62} metalness={0.08} envMapIntensity={0.9} />
      </RoundedBox>
      {!compact && [-0.54, -0.18, 0.18, 0.54].map((x) => <Line key={x} points={[[x, -0.675, -0.4], [x, -0.675, 0.45]]} color="#94a3b8" lineWidth={0.45} transparent opacity={0.18} />)}
    </group>
  )
}

function Chamber({ compact, accent }: { compact: boolean; accent: string }) {
  const posts: [number, number, number][] = [[-1.18, -0.04, -0.62], [1.18, -0.04, -0.62], [-1.18, -0.04, 0.62], [1.18, -0.04, 0.62]]
  return (
    <group>
      <RoundedBox castShadow receiveShadow position={[0, -0.03, 0]} args={[2.36, 1.45, 1.2]} radius={0.045} smoothness={4}>
        <GlassMaterial opacity={compact ? 0.14 : 0.22} />
        <Edges color="#d3e7f4" threshold={26} />
      </RoundedBox>
      {posts.map((p, i) => (
        <mesh key={i} castShadow position={p}>
          <boxGeometry args={[0.046, 1.54, 0.046]} />
          <MetalMaterial color="#8a949f" roughness={0.31} />
        </mesh>
      ))}
      <RoundedBox castShadow position={[0, 0.71, 0]} args={[2.52, 0.07, 1.32]} radius={0.02} smoothness={3}>
        <MetalMaterial color="#858d98" roughness={0.36} />
      </RoundedBox>
      <mesh position={[-0.98, -0.58, 0.66]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.36, 16]} />
        <meshStandardMaterial color={accent} metalness={0.4} roughness={0.42} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <Workbench compact={compact} />
    </group>
  )
}

function Camera({ active, runState, position, rotation = [0, -0.6, 0], compact, label = '高速摄像机' }: { active: boolean; runState: RunState; position: [number, number, number]; rotation?: [number, number, number]; compact: boolean; label?: string }) {
  const tooltip = DeviceTooltip({ text: label, compact })
  return (
    <group position={position} rotation={rotation} {...tooltip.bind}>
      <RoundedBox castShadow args={[0.32, 0.2, 0.22]} radius={0.018} smoothness={3}>
        <DeviceMaterial color="#465365" active={active} runState={runState} metalness={0.18} />
        {active && <Edges color={activeColor(runState, '#54d3bd')} />}
      </RoundedBox>
      <mesh castShadow position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.34, 12]} />
        <MetalMaterial color="#76808e" />
      </mesh>
      <mesh position={[0, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.112, 0.18, 32]} />
        <DeviceMaterial color="#1f2937" active={active} runState={runState} metalness={0.32} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.018, 32]} />
        <GlassMaterial tint="#99d7ff" opacity={0.48} />
      </mesh>
      <StatusLight active={active} runState={runState} position={[-0.12, 0.08, 0.13]} />
      {tooltip.tip}
    </group>
  )
}

function SensorProbe({ active, runState, position, compact, label }: { active: boolean; runState: RunState; position: [number, number, number]; compact: boolean; label: string }) {
  const tooltip = DeviceTooltip({ text: label, compact })
  return (
    <group position={position} {...tooltip.bind}>
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.32, 12]} />
        <MetalMaterial color="#98a4b3" />
      </mesh>
      <RoundedBox castShadow position={[0, 0.34, 0]} args={[0.16, 0.1, 0.1]} radius={0.014} smoothness={3}>
        <DeviceMaterial color="#71869b" active={active} runState={runState} />
      </RoundedBox>
      <StatusLight active={active} runState={runState} position={[0.058, 0.38, 0.054]} size={0.026} />
      {tooltip.tip}
    </group>
  )
}

function LifeScienceInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const incubator = isActive(active, 'incubator')
  const pipette = isActive(active, 'pipette')
  const microscope = isActive(active, 'microscope')
  return (
    <group>
      <AssetModel />
      <group position={[-0.67, -0.42, -0.08]}>
        <RoundedBox castShadow args={[0.54, 0.44, 0.38]} radius={0.025} smoothness={4}>
          <DeviceMaterial color="#647283" active={incubator} runState={active.status} metalness={0.08} roughness={0.5} />
          {incubator && <Edges color={activeColor(active.status, '#54d3bd')} />}
        </RoundedBox>
        <mesh position={[0, 0.02, 0.202]}>
          <boxGeometry args={[0.36, 0.25, 0.012]} />
          <GlassMaterial tint="#c9f6f3" opacity={0.4} />
        </mesh>
        {[-0.1, 0.04, 0.16].map((y) => <mesh key={y} position={[0, y, 0.03]}><boxGeometry args={[0.38, 0.012, 0.26]} /><MetalMaterial color="#c8d1dc" roughness={0.44} /></mesh>)}
        <StatusLight active={incubator} runState={active.status} position={[0.2, 0.15, 0.22]} />
      </group>
      <group position={[-0.1, -0.64, 0.19]}>
        <RoundedBox args={[0.55, 0.022, 0.28]} radius={0.012} smoothness={3}><GlassMaterial tint="#d9fbf5" opacity={0.32} /></RoundedBox>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[-0.22 + (i % 4) * 0.145, 0.033, -0.08 + Math.floor(i / 4) * 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.014, 24]} />
            <LiquidMaterial color={pipette ? '#8ff0de' : '#bfe7df'} opacity={0.58} />
          </mesh>
        ))}
      </group>
      <group position={[0.24, -0.47, 0.02]} rotation={[0, 0, -0.18]}>
        {[0, 0.17, 0.34].map((y) => <mesh key={y} castShadow position={[0, y, 0]}><cylinderGeometry args={[0.026, 0.034, 0.18, 16]} /><DeviceMaterial color="#9aa8b8" active={pipette} runState={active.status} metalness={0.18} /></mesh>)}
        <RoundedBox castShadow position={[0.12, 0.1, 0]} args={[0.26, 0.052, 0.07]} radius={0.014} smoothness={3}><DeviceMaterial color="#728092" active={pipette} runState={active.status} /></RoundedBox>
        <mesh position={[0.24, -0.08, 0]}><cylinderGeometry args={[0.009, 0.016, 0.26, 12]} /><DeviceMaterial color="#62b8ac" active={pipette} runState={active.status} /></mesh>
        <ActiveRing active={pipette} runState={active.status} position={[0.16, 0.05, 0]} />
      </group>
      <group position={[0.66, -0.48, -0.12]}>
        <RoundedBox castShadow args={[0.36, 0.08, 0.3]} radius={0.018} smoothness={3}><DeviceMaterial color="#4d5e70" active={microscope} runState={active.status} metalness={0.1} /></RoundedBox>
        <mesh castShadow position={[-0.09, 0.2, 0]}><cylinderGeometry args={[0.026, 0.026, 0.36, 18]} /><MetalMaterial color="#8793a4" /></mesh>
        <RoundedBox castShadow position={[0.03, 0.3, 0]} args={[0.22, 0.09, 0.14]} radius={0.018} smoothness={3}><DeviceMaterial color="#56677a" active={microscope} runState={active.status} /></RoundedBox>
        <mesh position={[0.05, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.048, 0.068, 0.18, 28]} /><DeviceMaterial color="#243244" active={microscope} runState={active.status} metalness={0.2} roughness={0.28} /></mesh>
        <mesh position={[0.05, 0.04, 0.02]}><boxGeometry args={[0.18, 0.018, 0.14]} /><GlassMaterial tint="#dce7eb" opacity={0.5} /></mesh>
        <ActiveRing active={microscope} runState={active.status} position={[0.04, 0.36, 0]} />
      </group>
      <Pipe points={[[-0.38, -0.18, 0.08], [0.18, -0.27, 0.18], [0.52, -0.36, 0.08]]} color="#8ee6d6" active={pipette || incubator} runState={active.status} />
      <SensorProbe active={isActive(active, 'co2-sensor') || incubator} runState={active.status} position={[0.9, -0.45, 0.24]} compact={compact} label="CO2 / 温湿度" />
    </group>
  )
}

function FluidPhysicsInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const pump = isActive(active, 'syringe-pump')
  const chip = isActive(active, 'fluid-chip')
  const camera = isActive(active, 'camera')
  return (
    <group>
      <group position={[-0.74, -0.5, 0.08]}>
        <RoundedBox castShadow args={[0.46, 0.22, 0.28]} radius={0.018} smoothness={3}><DeviceMaterial color="#5d6978" active={pump} runState={active.status} /></RoundedBox>
        <mesh position={[0.12, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 0.36, 24]} /><GlassMaterial tint="#d7ecf1" opacity={0.48} /></mesh>
        <mesh position={[0.27, 0.045, 0]}><boxGeometry args={[0.08, 0.08, 0.18]} /><MetalMaterial color="#aab6c4" /></mesh>
        <StatusLight active={pump} runState={active.status} position={[-0.17, 0.14, 0.13]} />
      </group>
      <group position={[0, -0.56, 0.12]}>
        <RoundedBox receiveShadow args={[0.72, 0.05, 0.36]} radius={0.018} smoothness={3}><GlassMaterial tint="#9addea" opacity={0.32} />{chip && <Edges color={activeColor(active.status, '#7dd3fc')} />}</RoundedBox>
        <Line points={[[-0.28, 0.045, -0.08], [-0.08, 0.05, -0.08], [0, 0.05, 0.06], [0.24, 0.05, 0.06]]} color={chip ? activeColor(active.status, '#7dd3fc') : '#7dd3fc'} lineWidth={2.1} transparent opacity={0.8} />
        {[-0.04, 0.08, 0.2].map((x) => <mesh key={x} position={[x, 0.072, 0.06]}><sphereGeometry args={[0.024, 18, 12]} /><LiquidMaterial color="#38c4d8" opacity={0.7} /></mesh>)}
        <ActiveRing active={chip} runState={active.status} position={[0.02, 0.18, 0.04]} />
      </group>
      <mesh position={[-0.45, -0.52, -0.28]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.16, 28]} /><LiquidMaterial color="#65d4e7" opacity={0.38} /></mesh>
      <Pipe points={[[-0.56, -0.47, 0.08], [-0.28, -0.45, 0.16], [-0.18, -0.53, 0.16]]} color="#69d7e8" active={pump || chip} runState={active.status} />
      <Pipe points={[[0.32, -0.52, 0.16], [0.54, -0.42, 0.06], [0.72, -0.38, -0.08]]} color="#69d7e8" active={chip} runState={active.status} />
      <Camera active={camera} runState={active.status} position={[0.74, -0.35, -0.25]} compact={compact} />
      <SensorProbe active={isActive(active, 'flow-sensor') || pump} runState={active.status} position={[0.84, -0.48, 0.25]} compact={compact} label="压力 / 流量" />
    </group>
  )
}

function MaterialInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const heater = isActive(active, 'heater')
  const cooling = isActive(active, 'cooling-loop')
  const sample = isActive(active, 'sample-stage')
  return (
    <group>
      <group position={[-0.54, -0.43, 0.02]}>
        <mesh castShadow><cylinderGeometry args={[0.25, 0.25, 0.36, 36]} /><DeviceMaterial color="#66533f" active={heater} runState={active.status} metalness={0.28} roughness={0.38} />{heater && <Edges color={activeColor(active.status, '#d29a4d')} />}</mesh>
        <mesh position={[0, 0.21, 0]}><cylinderGeometry args={[0.17, 0.17, 0.045, 36]} /><ScreenMaterial color="#332015" active={heater} /></mesh>
        <mesh position={[0, -0.03, 0.23]}><boxGeometry args={[0.22, 0.12, 0.018]} /><meshStandardMaterial color="#f2b24a" emissive="#c58a2b" emissiveIntensity={heater ? 0.36 : 0.1} transparent opacity={0.86} /></mesh>
        <StatusLight active={heater} runState={active.status} position={[0.17, 0.08, 0.19]} />
      </group>
      <group position={[0.04, -0.55, 0.1]}>
        <RoundedBox castShadow args={[0.48, 0.06, 0.32]} radius={0.015} smoothness={3}><DeviceMaterial color="#69717c" active={sample} runState={active.status} metalness={0.28} /></RoundedBox>
        <RoundedBox castShadow position={[0, 0.075, 0]} args={[0.2, 0.09, 0.16]} radius={0.01} smoothness={2}><DeviceMaterial color="#9a7a48" active={sample} runState={active.status} metalness={0.18} /></RoundedBox>
        {[-0.17, 0.17].map((x) => <mesh key={x} position={[x, 0.13, 0]}><boxGeometry args={[0.052, 0.17, 0.044]} /><MetalMaterial color="#a4adba" /></mesh>)}
        <ActiveRing active={sample} runState={active.status} position={[0, 0.27, 0]} />
      </group>
      <group position={[0.56, -0.48, 0.2]}>
        <RoundedBox castShadow position={[0.18, 0.02, 0]} args={[0.17, 0.23, 0.12]} radius={0.015} smoothness={3}><DeviceMaterial color="#5a6c7a" active={cooling} runState={active.status} /></RoundedBox>
        {[0, 1, 2, 3].map((i) => <Line key={i} points={[[-0.18, -0.07 + i * 0.047, 0], [0.11, -0.07 + i * 0.047, 0]]} color="#77c9d3" lineWidth={1.05} transparent opacity={0.7} />)}
        <RoundedBox position={[0.27, 0.15, 0]} args={[0.18, 0.044, 0.18]} radius={0.01} smoothness={2}><DeviceMaterial color="#65a9b2" active={cooling} runState={active.status} /></RoundedBox>
      </group>
      <Pipe points={[[0.24, -0.46, 0.12], [0.44, -0.31, 0.22], [0.72, -0.44, 0.2], [0.34, -0.62, 0.12]]} color="#77c9d3" active={cooling} runState={active.status} />
      <Camera active={false} runState={active.status} position={[0.72, -0.31, -0.22]} rotation={[0, -0.52, 0]} compact={compact} label="观察相机" />
      <SensorProbe active={isActive(active, 'thermal-probe') || heater} runState={active.status} position={[0.86, -0.48, 0.23]} compact={compact} label="热电偶探头" />
    </group>
  )
}

function CombustionInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const chamber = isActive(active, 'combustion-chamber') || active.status === 'error'
  const nozzle = isActive(active, 'nozzle')
  const igniter = isActive(active, 'igniter')
  return (
    <group>
      <group position={[-0.2, -0.4, 0.02]}>
        <mesh castShadow><cylinderGeometry args={[0.29, 0.29, 0.52, 40]} /><GlassMaterial tint="#d4e9f5" opacity={0.26} />{chamber && <Edges color={activeColor(active.status, '#c65a3a')} />}</mesh>
        <mesh position={[0, -0.01, 0]}><sphereGeometry args={[0.064, 22, 14]} /><meshStandardMaterial color="#f2a766" emissive="#c65a3a" emissiveIntensity={chamber ? 0.28 : 0.08} transparent opacity={0.45} /></mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.024, 0.052, 0.32, 20]} /><DeviceMaterial color="#c65a3a" active={nozzle} runState={active.status} /></mesh>
        <mesh position={[0.19, 0.08, 0]} rotation={[0, 0, Math.PI / 4]}><cylinderGeometry args={[0.011, 0.011, 0.34, 12]} /><DeviceMaterial color="#d1d5db" active={igniter} runState={active.status} metalness={0.58} /></mesh>
        <ActiveRing active={chamber || nozzle || igniter} runState={active.status} position={[0, 0.34, 0]} />
      </group>
      <Camera active={isActive(active, 'camera')} runState={active.status} position={[0.56, -0.32, -0.25]} compact={compact} />
      <Pipe points={[[-0.2, -0.15, 0.28], [0.2, -0.08, 0.42], [0.78, -0.28, 0.3]]} color="#a8b4c4" active={isActive(active, 'pressure-sensor') || active.status === 'error'} runState={active.status} />
      <SensorProbe active={isActive(active, 'pressure-sensor')} runState={active.status} position={[0.9, -0.48, 0.02]} compact={compact} label="温度 / 压力" />
      <StatusLight active={active.status === 'error'} runState={active.status} position={[0.76, -0.34, 0.24]} />
    </group>
  )
}

function EarthObserveInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const telescope = isActive(active, 'telescope')
  const spectrometer = isActive(active, 'spectrometer')
  const gimbal = isActive(active, 'gimbal')
  const data = isActive(active, 'data-unit')
  return (
    <group>
      <group position={[-0.48, -0.41, 0]} rotation={[0, 0.08, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.25, 0.44, 36]} /><DeviceMaterial color="#40556a" active={telescope} runState={active.status} metalness={0.25} roughness={0.3} /></mesh>
        <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.045, 36]} /><GlassMaterial tint="#9bc1d4" opacity={0.54} /></mesh>
        <mesh position={[-0.08, -0.2, 0]}><boxGeometry args={[0.22, 0.055, 0.24]} /><DeviceMaterial color="#7b8797" active={gimbal || telescope} runState={active.status} /></mesh>
      </group>
      <group position={[0.1, -0.49, 0.05]}>
        <RoundedBox castShadow args={[0.44, 0.22, 0.34]} radius={0.018} smoothness={3}><DeviceMaterial color="#31495a" active={spectrometer} runState={active.status} metalness={0.14} /></RoundedBox>
        <mesh position={[0, 0.035, 0.185]}><boxGeometry args={[0.3, 0.025, 0.012]} /><ScreenMaterial color="#0a1c29" active={spectrometer} /></mesh>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[-0.15 + i * 0.1, 0.14, 0.19]}><boxGeometry args={[0.055, 0.035, 0.012]} /><DeviceMaterial color={i === 1 ? '#4caa65' : '#8aa4bd'} active={spectrometer || telescope} runState={active.status} /></mesh>)}
      </group>
      <group position={[0.6, -0.55, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.17, 0.17, 0.08, 32]} /><DeviceMaterial color="#5d6b7c" active={gimbal} runState={active.status} metalness={0.28} /></mesh>
        <RoundedBox position={[0, 0.14, 0]} args={[0.32, 0.14, 0.23]} radius={0.018} smoothness={3}><DeviceMaterial color="#415364" active={gimbal || data} runState={active.status} /></RoundedBox>
        <mesh position={[0.01, 0.26, 0.08]}><boxGeometry args={[0.2, 0.07, 0.05]} /><ScreenMaterial active={data} /></mesh>
        <StatusLight active={gimbal || data} runState={active.status} position={[0.12, 0.32, 0.11]} />
      </group>
      <Pipe points={[[-0.22, -0.4, 0.02], [0.02, -0.42, 0.05], [0.42, -0.44, 0.04]]} color="#86efac" active={spectrometer || data} runState={active.status} />
    </group>
  )
}

function BioTechInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const electrophoresis = isActive(active, 'electrophoresis') || active.status === 'error'
  const rack = isActive(active, 'sample-rack')
  const sensor = isActive(active, 'buffer-sensor')
  return (
    <group>
      <group position={[-0.42, -0.53, 0.08]}>
        <RoundedBox castShadow args={[0.62, 0.19, 0.38]} radius={0.022} smoothness={4}><GlassMaterial tint="#9fc2d8" opacity={0.36} />{electrophoresis && <Edges color={activeColor(active.status, '#ef6666')} />}</RoundedBox>
        <mesh position={[0, 0.015, 0.02]}><boxGeometry args={[0.44, 0.045, 0.25]} /><LiquidMaterial color={active.status === 'error' ? '#ef6666' : '#8765c7'} opacity={0.58} /></mesh>
        {[-0.18, -0.09, 0, 0.09, 0.18].map((x) => <mesh key={x} position={[x, 0.078, 0.18]}><boxGeometry args={[0.018, 0.085, 0.016]} /><DeviceMaterial color={x < 0 ? '#ef4444' : '#111827'} active={electrophoresis} runState={active.status} /></mesh>)}
        <StatusLight active={electrophoresis} runState={active.status} position={[-0.27, 0.08, -0.1]} />
      </group>
      <group position={[0.28, -0.55, 0.05]}>
        <RoundedBox castShadow args={[0.44, 0.08, 0.3]} radius={0.016} smoothness={3}><DeviceMaterial color="#4b5563" active={rack} runState={active.status} /></RoundedBox>
        {[-0.15, -0.04, 0.07, 0.17].map((x, i) => <mesh key={x} position={[x, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.024, 0.032, 0.18, 18]} /><LiquidMaterial color={i % 2 ? '#b8a8df' : '#a5d8ff'} opacity={0.66} /></mesh>)}
        <mesh position={[0.08, 0.2, -0.17]} rotation={[0, 0, -0.35]}><cylinderGeometry args={[0.018, 0.024, 0.3, 12]} /><DeviceMaterial color="#d6d3d1" active={rack} runState={active.status} /></mesh>
      </group>
      <group position={[0.73, -0.48, -0.08]}>
        <RoundedBox castShadow args={[0.32, 0.21, 0.23]} radius={0.018} smoothness={3}><DeviceMaterial color="#536173" active={electrophoresis} runState={active.status} /></RoundedBox>
        <mesh position={[0, 0.012, 0.124]}><boxGeometry args={[0.19, 0.06, 0.012]} /><ScreenMaterial active={electrophoresis} /></mesh>
      </group>
      <Pipe points={[[-0.64, -0.46, -0.02], [-0.54, -0.22, -0.18], [0.63, -0.35, -0.05]]} color="#ef4444" active={electrophoresis} runState={active.status} />
      <Pipe points={[[-0.18, -0.46, -0.02], [0.12, -0.28, -0.18], [0.63, -0.36, -0.04]]} color="#1f2937" active={electrophoresis} runState={active.status} />
      <SensorProbe active={sensor || electrophoresis} runState={active.status} position={[0.86, -0.49, 0.25]} compact={compact} label="缓冲液液位" />
    </group>
  )
}

function ModuleInterior({ module, active, compact }: { module: LabModule; active: ActiveInstrumentInfo; compact: boolean }) {
  if (module.moduleType === 'life_science') return <LifeScienceInterior active={active} compact={compact} />
  if (module.moduleType === 'fluid_physics') return <FluidPhysicsInterior active={active} compact={compact} />
  if (module.moduleType === 'material') return <MaterialInterior active={active} compact={compact} />
  if (module.moduleType === 'combustion') return <CombustionInterior active={active} compact={compact} />
  if (module.moduleType === 'earth_observe') return <EarthObserveInterior active={active} compact={compact} />
  if (module.moduleType === 'bio') return <BioTechInterior active={active} compact={compact} />
  return <SensorProbe active runState={active.status} position={[0.4, -0.42, 0.2]} compact={compact} label="传感器" />
}

function LabModel({ module, active, compact = false, autoRotate = false }: { module: LabModule; active: ActiveInstrumentInfo; compact?: boolean; autoRotate?: boolean }) {
  const ref = useRef<Group>(null)
  const accent = accentByType[module.moduleType]
  useFrame((_, delta) => {
    if (ref.current && (autoRotate || compact)) ref.current.rotation.y += delta * (compact ? 0.055 : 0.035)
  })
  return (
    <group ref={ref} rotation={[0.12, compact ? -0.48 : -0.36, 0]} scale={compact ? 0.92 : 1.04}>
      <Chamber compact={compact} accent={accent} />
      <ModuleInterior module={module} active={active} compact={compact} />
      <StatusLight active={active.status !== 'idle'} runState={active.status} position={[1.03, 0.58, 0.62]} />
    </group>
  )
}

function DetailBadge({ active, module }: { active: ActiveInstrumentInfo; module: LabModule }) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 rounded border border-white/10 bg-black/45 px-2 py-1 text-[10px] text-slate-300 backdrop-blur">
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeColor(active.status, accentByType[module.moduleType]) }} />
      {active.label} · {statusText[active.status]}
    </div>
  )
}

function LabFallback({ module, active }: { module: LabModule; active: ActiveInstrumentInfo }) {
  const accent = accentByType[module.moduleType]
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded border border-white/10 bg-black/15">
      <svg viewBox="0 0 180 130" className="h-[92%] max-h-full">
        <rect x="18" y="16" width="144" height="86" rx="8" fill="#b6d6ea" fillOpacity="0.14" stroke="#8ea3b7" strokeWidth="2" />
        <rect x="28" y="88" width="124" height="12" rx="2" fill="#77818d" />
        <rect x="38" y="50" width="34" height="25" rx="3" fill={active.instrument.includes('incubator') || active.instrument.includes('electrophoresis') ? activeColor(active.status, accent) : '#657386'} fillOpacity="0.75" />
        <circle cx="92" cy="66" r="15" fill={active.instrument.includes('chip') || active.instrument.includes('chamber') ? activeColor(active.status, accent) : '#78aab6'} fillOpacity="0.62" />
        <rect x="115" y="43" width="31" height="24" rx="3" fill={active.instrument.includes('camera') || active.instrument.includes('scope') || active.instrument.includes('telescope') ? activeColor(active.status, accent) : '#405166'} fillOpacity="0.78" />
        <path d="M50 82 C78 66, 112 78, 138 58" fill="none" stroke={accent} strokeWidth="2" strokeOpacity="0.62" />
      </svg>
    </div>
  )
}

export default function LabModule3DScene({
  module,
  compact = false,
  interactive = false,
  autoRotate = compact,
  height = compact ? 132 : 260,
  currentStepId,
  currentStepName,
  dagSteps,
}: LabModule3DSceneProps) {
  const style = typeof height === 'number' ? { height: `${height}px` } : { height }
  const activeStepName = getActiveStep(module, currentStepId, currentStepName, dagSteps)
  const active = useMemo(() => getActiveInstrument(module, activeStepName), [module, activeStepName])
  const accent = accentByType[module.moduleType]

  if (!webglAvailable()) {
    return <div style={style}><LabFallback module={module} active={active} /></div>
  }

  return (
    <div style={style} className="relative overflow-hidden rounded border border-white/10 bg-[#071019]">
      {!compact && <DetailBadge active={active} module={module} />}
      <Suspense fallback={<LabFallback module={module} active={active} />}>
        <Canvas
          shadows
          camera={{ position: compact ? [0.12, 0.08, 4.25] : [0.1, 0.02, 3.65], fov: compact ? 31 : 36 }}
          dpr={compact ? [1, 1.15] : [1, 1.65]}
          gl={{ antialias: !compact, alpha: false, powerPreference: compact ? 'low-power' : 'high-performance' }}
        >
          <StudioLighting compact={compact} accent={accent} />
          <LabModel module={module} active={active} compact={compact} autoRotate={autoRotate} />
          <ContactShadows position={[0, -0.91, 0]} opacity={compact ? 0.24 : 0.38} scale={3.4} blur={compact ? 1.4 : 2.1} far={1.75} />
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
