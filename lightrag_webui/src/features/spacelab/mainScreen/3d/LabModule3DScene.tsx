import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Edges, OrbitControls, RoundedBox } from '@react-three/drei'
import type { Group } from 'three'
import type { DagStep, LabModule } from '../../types'
import { AssetSlot } from '../three/AssetSlot'
import { LabContactShadows, LabLighting } from '../three/LabLighting'
import { accentByType, activeColor, glassMaterial, metalMaterial, type RunState } from '../three/materials'
import { ActiveOutline, Body, GlassPane, MetalRod, OledPanel, PlasticBase, StatusLight, TubePath } from '../three/instruments/common'
import BeakerModel from '../three/instruments/BeakerModel'
import CombustionChamberModel from '../three/instruments/CombustionChamberModel'
import ElectrophoresisTankModel from '../three/instruments/ElectrophoresisTankModel'
import HeaterModel from '../three/instruments/HeaterModel'
import HighSpeedCameraModel from '../three/instruments/HighSpeedCameraModel'
import MicroscopeModel from '../three/instruments/MicroscopeModel'
import MicrofluidicChipModel from '../three/instruments/MicrofluidicChipModel'
import PetriDishModel from '../three/instruments/PetriDishModel'
import PipetteArmModel from '../three/instruments/PipetteArmModel'
import SensorProbeModel from '../three/instruments/SensorProbeModel'
import SpectrometerModel from '../three/instruments/SpectrometerModel'
import SyringePumpModel from '../three/instruments/SyringePumpModel'
import TestTubeRackModel from '../three/instruments/TestTubeRackModel'

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
    if (/接种|移液|配制|培养基/.test(text)) return { instrument: 'pipette-arm', label: '移液机械臂', status }
    if (/co₂|co2|预热|培养|复苏|细胞/.test(text)) return { instrument: 'incubator', label: 'CO2培养箱', status }
    return { instrument: 'sensor-probe', label: 'CO2/温湿度传感器', status }
  }
  if (module.moduleType === 'fluid_physics') {
    if (/高速摄像|摄像|相机/.test(text)) return { instrument: 'high-speed-camera', label: '高速摄像机', status }
    if (/注入|泵|液相/.test(text)) return { instrument: 'syringe-pump', label: '注射泵与管路', status }
    if (/液滴|流体|界面|芯片|毛细|接触角/.test(text)) return { instrument: 'microfluidic-chip', label: '微流控芯片', status }
    return { instrument: 'flow-sensor', label: '压力/流量传感器', status }
  }
  if (module.moduleType === 'material') {
    if (/冷却|回路|水/.test(text)) return { instrument: 'cooling-loop', label: '冷却回路', status }
    if (/加热|热台|升温|保温|热|退火|熔炼/.test(text)) return { instrument: 'heater', label: '小型加热炉', status }
    if (/样品|表征|xrd|结构|观察|性能/.test(text)) return { instrument: 'sample-stage', label: '样品台', status }
    return { instrument: 'thermal-probe', label: '热电偶探头', status }
  }
  if (module.moduleType === 'combustion') {
    if (/图像|高速摄像|摄像|分析/.test(text)) return { instrument: 'high-speed-camera', label: '高速摄像机', status }
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
    if (module.status === 'error' || /sds-page 电泳缓冲液分离|电泳|sds|page|缓冲液|凝胶|分离/.test(text)) return { instrument: 'electrophoresis-tank', label: 'SDS-PAGE电泳槽', status }
    if (/蛋白|样品|筛选|试剂|离心/.test(text)) return { instrument: 'test-tube-rack', label: '样品架', status }
    return { instrument: 'buffer-sensor', label: '缓冲液液位传感器', status }
  }
  return { instrument: 'sensor-probe', label: '舱体监控屏', status }
}

function isActive(active: ActiveInstrumentInfo, instrument: string) {
  return active.instrument === instrument
}

function Slot({
  name,
  fallback,
  label,
  compact,
  ...props
}: {
  name: string
  fallback: React.ReactNode
  label?: string
  compact?: boolean
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}) {
  return <AssetSlot url={`/models/${name}.glb`} fallback={fallback} label={label} compact={compact} {...props} />
}

function Workbench({ compact }: { compact: boolean }) {
  return (
    <group>
      <RoundedBox receiveShadow position={[0, -0.8, 0]} args={[2.55, 0.12, 1.28]} radius={0.025} smoothness={3}>
        <meshStandardMaterial {...metalMaterial} color="#77818d" />
      </RoundedBox>
      <RoundedBox receiveShadow position={[0, -0.705, 0.03]} args={[2.12, 0.045, 0.92]} radius={0.018} smoothness={3}>
        <meshStandardMaterial color="#d8dddd" roughness={0.62} metalness={0.08} envMapIntensity={0.9} />
      </RoundedBox>
      {!compact && [-0.54, -0.18, 0.18, 0.54].map((x) => <TubePath key={x} points={[[x, -0.675, -0.4], [x, -0.675, 0.45]]} color="#94a3b8" radius={0.0025} />)}
    </group>
  )
}

function Chamber({ compact, accent }: { compact: boolean; accent: string }) {
  const posts: [number, number, number][] = [[-1.18, -0.04, -0.62], [1.18, -0.04, -0.62], [-1.18, -0.04, 0.62], [1.18, -0.04, 0.62]]
  return (
    <group>
      <RoundedBox castShadow receiveShadow position={[0, -0.03, 0]} args={[2.36, 1.45, 1.2]} radius={0.045} smoothness={4}>
        <meshPhysicalMaterial {...glassMaterial} opacity={compact ? 0.11 : 0.2} />
        <Edges color="#d3e7f4" threshold={26} />
      </RoundedBox>
      {posts.map((p, i) => <MetalRod key={i} position={p} length={1.54} radius={0.022} />)}
      <RoundedBox castShadow position={[0, 0.71, 0]} args={[2.52, 0.07, 1.32]} radius={0.02} smoothness={3}>
        <meshStandardMaterial {...metalMaterial} color="#858d98" />
      </RoundedBox>
      <mesh position={[-0.98, -0.58, 0.66]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.36, 16]} />
        <meshStandardMaterial color={accent} metalness={0.4} roughness={0.42} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <Workbench compact={compact} />
    </group>
  )
}

function Incubator({ active, runState, compact }: { active: boolean; runState: RunState; compact: boolean }) {
  return (
    <group>
      <Body args={[0.54, 0.44, 0.38]} color="#647283" active={active} runState={runState} />
      <GlassPane args={[0.36, 0.25, 0.012]} position={[0, 0.02, 0.202]} opacity={compact ? 0.28 : 0.42} />
      {[-0.1, 0.04, 0.16].map((y) => <PlasticBase key={y} args={[0.38, 0.012, 0.26]} position={[0, y, 0.03]} color="#c8d1dc" />)}
      <OledPanel active={active} position={[-0.13, 0.16, 0.21]} size={[0.14, 0.044]} />
      <StatusLight active={active} runState={runState} position={[0.2, 0.15, 0.22]} />
    </group>
  )
}

function Telescope({ active, runState }: { active: boolean; runState: RunState }) {
  return (
    <group rotation={[0, 0.08, 0]}>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.25, 0.44, 36]} />
        <meshStandardMaterial color={active ? activeColor(runState, '#40556a') : '#40556a'} metalness={0.25} roughness={0.3} />
      </mesh>
      <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.045, 36]} />
        <meshPhysicalMaterial {...glassMaterial} color="#9bc1d4" opacity={0.54} />
      </mesh>
      <Body args={[0.22, 0.055, 0.24]} position={[-0.08, -0.2, 0]} color="#7b8797" active={active} runState={runState} />
      <ActiveOutline active={active} runState={runState} position={[0, 0.18, 0]} radius={0.22} />
    </group>
  )
}

function GimbalDataUnit({ active, dataActive, runState }: { active: boolean; dataActive: boolean; runState: RunState }) {
  return (
    <group>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.08, 32]} />
        <meshStandardMaterial {...metalMaterial} color="#5d6b7c" />
      </mesh>
      <Body args={[0.32, 0.14, 0.23]} position={[0, 0.14, 0]} color="#415364" active={active || dataActive} runState={runState} />
      <OledPanel active={dataActive} position={[0.01, 0.26, 0.08]} size={[0.2, 0.07]} />
      <StatusLight active={active || dataActive} runState={runState} position={[0.12, 0.32, 0.11]} />
    </group>
  )
}

function SampleStage({ active, runState }: { active: boolean; runState: RunState }) {
  return (
    <group>
      <Body args={[0.48, 0.06, 0.32]} color="#69717c" active={active} runState={runState} />
      <Body args={[0.2, 0.09, 0.16]} position={[0, 0.075, 0]} color="#9a7a48" active={active} runState={runState} radius={0.01} />
      {[-0.17, 0.17].map((x) => <MetalRod key={x} position={[x, 0.13, 0]} length={0.17} radius={0.024} />)}
      <ActiveOutline active={active} runState={runState} position={[0, 0.27, 0]} radius={0.18} />
    </group>
  )
}

function PowerModule({ active, runState }: { active: boolean; runState: RunState }) {
  return (
    <group>
      <Body args={[0.32, 0.21, 0.23]} color="#536173" active={active} runState={runState} />
      <OledPanel active={active} position={[0, 0.012, 0.124]} size={[0.19, 0.06]} />
      <StatusLight active={active} runState={runState} position={[0.1, 0.11, 0.12]} />
    </group>
  )
}

function LifeScienceInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const incubator = isActive(active, 'incubator')
  const pipette = isActive(active, 'pipette-arm')
  const microscope = isActive(active, 'microscope')
  return (
    <group>
      <group position={[-0.67, -0.42, -0.08]}><Incubator active={incubator} runState={active.status} compact={compact} /></group>
      <Slot name="petri_dish" compact={compact} label="培养皿阵列" position={[-0.1, -0.64, 0.19]} fallback={<PetriDishModel active={pipette} runState={active.status} compact={compact} />} />
      <Slot name="pipette_arm" compact={compact} label="移液机械臂" position={[0.18, -0.47, 0.02]} fallback={<PipetteArmModel active={pipette} runState={active.status} compact={compact} />} />
      <Slot name="microscope" compact={compact} label="显微成像模块" position={[0.66, -0.48, -0.12]} fallback={<MicroscopeModel active={microscope} runState={active.status} compact={compact} />} />
      <TubePath points={[[-0.38, -0.18, 0.08], [0.18, -0.27, 0.18], [0.52, -0.36, 0.08]]} color="#8ee6d6" active={pipette || incubator} runState={active.status} />
      <Slot name="sensor_probe" compact={compact} label="CO2 / 温湿度" position={[0.9, -0.45, 0.24]} fallback={<SensorProbeModel active={isActive(active, 'sensor-probe') || incubator} runState={active.status} compact={compact} label="CO2 / 温湿度" />} />
    </group>
  )
}

function FluidPhysicsInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const pump = isActive(active, 'syringe-pump')
  const chip = isActive(active, 'microfluidic-chip')
  const camera = isActive(active, 'high-speed-camera')
  return (
    <group>
      <Slot name="syringe_pump" compact={compact} label="注射泵" position={[-0.74, -0.5, 0.08]} fallback={<SyringePumpModel active={pump} runState={active.status} compact={compact} />} />
      <Slot name="microfluidic_chip" compact={compact} label="微流控芯片" position={[0, -0.56, 0.12]} fallback={<MicrofluidicChipModel active={chip} runState={active.status} compact={compact} />} />
      <Slot name="beaker" compact={compact} label="烧杯 / 储液器" position={[-0.45, -0.58, -0.28]} fallback={<BeakerModel active={pump || chip} runState={active.status} compact={compact} />} />
      <TubePath points={[[-0.56, -0.47, 0.08], [-0.28, -0.45, 0.16], [-0.18, -0.53, 0.16]]} color="#69d7e8" active={pump || chip} runState={active.status} />
      <TubePath points={[[0.32, -0.52, 0.16], [0.54, -0.42, 0.06], [0.72, -0.38, -0.08]]} color="#69d7e8" active={chip} runState={active.status} />
      <Slot name="high_speed_camera" compact={compact} label="高速摄像机" position={[0.74, -0.35, -0.25]} rotation={[0, -0.6, 0]} fallback={<HighSpeedCameraModel active={camera} runState={active.status} compact={compact} />} />
      <Slot name="sensor_probe" compact={compact} label="压力 / 流量" position={[0.84, -0.48, 0.25]} fallback={<SensorProbeModel active={isActive(active, 'flow-sensor') || pump} runState={active.status} compact={compact} label="压力 / 流量" />} />
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
      <group position={[-0.48, -0.41, 0]}><Telescope active={telescope} runState={active.status} /></group>
      <Slot name="spectrometer" compact={compact} label="光谱仪模块" position={[0.1, -0.49, 0.05]} fallback={<SpectrometerModel active={spectrometer} runState={active.status} compact={compact} />} />
      <group position={[0.6, -0.55, 0]}><GimbalDataUnit active={gimbal} dataActive={data} runState={active.status} /></group>
      <TubePath points={[[-0.22, -0.4, 0.02], [0.02, -0.42, 0.05], [0.42, -0.44, 0.04]]} color="#86efac" active={spectrometer || data} runState={active.status} />
    </group>
  )
}

function BioTechInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const electrophoresis = isActive(active, 'electrophoresis-tank') || active.status === 'error'
  const rack = isActive(active, 'test-tube-rack')
  const sensor = isActive(active, 'buffer-sensor')
  return (
    <group>
      <Slot name="electrophoresis_tank" compact={compact} label="SDS-PAGE电泳槽" position={[-0.42, -0.53, 0.08]} fallback={<ElectrophoresisTankModel active={electrophoresis} runState={active.status} compact={compact} />} />
      <Slot name="test_tube_rack" compact={compact} label="样品试管架" position={[0.28, -0.55, 0.05]} fallback={<TestTubeRackModel active={rack} runState={active.status} compact={compact} />} />
      <group position={[0.73, -0.48, -0.08]}><PowerModule active={electrophoresis} runState={active.status} /></group>
      <TubePath points={[[-0.64, -0.46, -0.02], [-0.54, -0.22, -0.18], [0.63, -0.35, -0.05]]} color="#ef4444" active={electrophoresis} runState={active.status} />
      <TubePath points={[[-0.18, -0.46, -0.02], [0.12, -0.28, -0.18], [0.63, -0.36, -0.04]]} color="#1f2937" active={electrophoresis} runState={active.status} />
      <Slot name="sensor_probe" compact={compact} label="缓冲液液位" position={[0.86, -0.49, 0.25]} fallback={<SensorProbeModel active={sensor || electrophoresis} runState={active.status} compact={compact} label="缓冲液液位" />} />
    </group>
  )
}

function MaterialInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const heater = isActive(active, 'heater')
  const cooling = isActive(active, 'cooling-loop')
  const sample = isActive(active, 'sample-stage')
  return (
    <group>
      <Slot name="heater" compact={compact} label="小型加热炉" position={[-0.54, -0.43, 0.02]} fallback={<HeaterModel active={heater} runState={active.status} compact={compact} />} />
      <group position={[0.04, -0.55, 0.1]}><SampleStage active={sample} runState={active.status} /></group>
      <group position={[0.56, -0.48, 0.2]}>
        <Body args={[0.17, 0.23, 0.12]} position={[0.18, 0.02, 0]} color="#5a6c7a" active={cooling} runState={active.status} />
        {[0, 1, 2, 3].map((i) => <TubePath key={i} points={[[-0.18, -0.07 + i * 0.047, 0], [0.11, -0.07 + i * 0.047, 0]]} color="#77c9d3" radius={0.004} />)}
        <Body args={[0.18, 0.044, 0.18]} position={[0.27, 0.15, 0]} color="#65a9b2" active={cooling} runState={active.status} radius={0.01} />
      </group>
      <TubePath points={[[0.24, -0.46, 0.12], [0.44, -0.31, 0.22], [0.72, -0.44, 0.2], [0.34, -0.62, 0.12]]} color="#77c9d3" active={cooling} runState={active.status} />
      <Slot name="high_speed_camera" compact={compact} label="观察相机" position={[0.72, -0.31, -0.22]} rotation={[0, -0.52, 0]} fallback={<HighSpeedCameraModel active={false} runState={active.status} compact={compact} label="观察相机" />} />
      <Slot name="sensor_probe" compact={compact} label="热电偶探头" position={[0.86, -0.48, 0.23]} fallback={<SensorProbeModel active={isActive(active, 'thermal-probe') || heater} runState={active.status} compact={compact} label="热电偶探头" />} />
    </group>
  )
}

function CombustionInterior({ active, compact }: { active: ActiveInstrumentInfo; compact: boolean }) {
  const chamber = isActive(active, 'combustion-chamber') || active.status === 'error'
  const nozzle = isActive(active, 'nozzle')
  const igniter = isActive(active, 'igniter')
  return (
    <group>
      <Slot name="combustion_chamber" compact={compact} label="透明燃烧室" position={[-0.2, -0.4, 0.02]} fallback={<CombustionChamberModel active={chamber || nozzle || igniter} runState={active.status} compact={compact} />} />
      <Slot name="high_speed_camera" compact={compact} label="高速摄像机" position={[0.56, -0.32, -0.25]} rotation={[0, -0.5, 0]} fallback={<HighSpeedCameraModel active={isActive(active, 'high-speed-camera')} runState={active.status} compact={compact} />} />
      <TubePath points={[[-0.2, -0.15, 0.28], [0.2, -0.08, 0.42], [0.78, -0.28, 0.3]]} color="#a8b4c4" active={isActive(active, 'pressure-sensor') || active.status === 'error'} runState={active.status} />
      <Slot name="sensor_probe" compact={compact} label="温度 / 压力" position={[0.9, -0.48, 0.02]} fallback={<SensorProbeModel active={isActive(active, 'pressure-sensor')} runState={active.status} compact={compact} label="温度 / 压力" />} />
      <StatusLight active={active.status === 'error'} runState={active.status} position={[0.76, -0.34, 0.24]} />
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
  return <SensorProbeModel active runState={active.status} compact={compact} label="传感器" />
}

function LabModel({ module, active, compact = false, autoRotate = false }: { module: LabModule; active: ActiveInstrumentInfo; compact?: boolean; autoRotate?: boolean }) {
  const ref = useRef<Group>(null)
  const accent = accentByType[module.moduleType]
  useFrame((_, delta) => {
    if (ref.current && autoRotate) ref.current.rotation.y += delta * (compact ? 0.04 : 0.03)
  })
  return (
    <group ref={ref} rotation={[0.12, compact ? -0.52 : -0.36, 0]} scale={compact ? 0.92 : 1.04}>
      <Chamber compact={compact} accent={accent} />
      <ModuleInterior module={module} active={active} compact={compact} />
      <StatusLight active={active.status !== 'idle'} runState={active.status} position={[1.03, 0.58, 0.62]} />
    </group>
  )
}

function DetailChip({ active, module, stepName }: { active: ActiveInstrumentInfo; module: LabModule; stepName?: string }) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 max-w-[68%] rounded border border-white/10 bg-black/45 px-2 py-1 text-[10px] leading-tight text-slate-300 backdrop-blur">
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeColor(active.status, accentByType[module.moduleType]) }} />
      {active.label} · {statusText[active.status]}
      {stepName && <span className="ml-1 text-slate-500">{stepName}</span>}
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
        <circle cx="50" cy="65" r="15" fill={activeColor(active.status, accent)} fillOpacity="0.5" />
        <rect x="82" y="48" width="32" height="30" rx="4" fill="#5b6d80" />
        <path d="M48 82 C78 60, 112 78, 138 58" fill="none" stroke={accent} strokeWidth="2" strokeOpacity="0.62" />
      </svg>
    </div>
  )
}

export default function LabModule3DScene({
  module,
  compact = false,
  interactive = false,
  autoRotate = false,
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
      {!compact && <DetailChip active={active} module={module} stepName={activeStepName} />}
      <Suspense fallback={<LabFallback module={module} active={active} />}>
        <Canvas
          shadows
          camera={{ position: compact ? [0.12, 0.08, 4.25] : [0.1, 0.02, 3.65], fov: compact ? 31 : 36 }}
          dpr={compact ? [1, 1.15] : [1, 1.65]}
          gl={{ antialias: !compact, alpha: false, powerPreference: compact ? 'low-power' : 'high-performance' }}
        >
          <LabLighting compact={compact} accent={accent} />
          <LabModel module={module} active={active} compact={compact} autoRotate={autoRotate} />
          <LabContactShadows compact={compact} />
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
