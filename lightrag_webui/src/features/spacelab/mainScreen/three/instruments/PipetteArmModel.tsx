import { ActiveOutline, Body, MetalRod, SmallTooltip, StatusLight, type InstrumentProps } from './common'
import { glassMaterial, metalMaterial } from '../materials'

export default function PipetteArmModel({ active = false, runState = 'idle', compact = false, label = '移液机械臂' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label}>
      <group rotation={[0, 0, -0.16]}>
        <MetalRod position={[0, 0.05, 0]} length={0.3} radius={0.026} />
        <Body args={[0.28, 0.054, 0.075]} position={[0.14, 0.18, 0]} color="#728092" active={active} runState={runState} />
        <Body args={[0.18, 0.05, 0.065]} position={[0.34, 0.16, 0]} color="#9aa8b8" active={active} runState={runState} />
        <mesh castShadow position={[0.45, 0.03, 0]}>
          <cylinderGeometry args={[0.011, 0.018, 0.28, 14]} />
          <meshStandardMaterial {...metalMaterial} color={active ? '#54d3bd' : '#8b9aac'} />
        </mesh>
        <mesh position={[0.45, -0.14, 0]}>
          <cylinderGeometry args={[0.006, 0.016, 0.1, 12]} />
          <meshPhysicalMaterial {...glassMaterial} opacity={0.44} />
        </mesh>
        <StatusLight active={active} runState={runState} position={[0.26, 0.2, 0.04]} />
        <ActiveOutline active={active} runState={runState} position={[0.26, 0.14, 0]} radius={0.19} />
      </group>
    </SmallTooltip>
  )
}
