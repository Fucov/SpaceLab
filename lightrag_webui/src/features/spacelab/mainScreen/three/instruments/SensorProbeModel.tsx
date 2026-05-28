import { Body, MetalRod, SmallTooltip, StatusLight, TubePath, type InstrumentProps } from './common'
import { metalMaterial } from '../materials'

export default function SensorProbeModel({ active = false, runState = 'idle', compact = false, label = '传感器探头' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label}>
      <group>
        <MetalRod position={[0, 0.12, 0]} length={0.34} radius={0.012} />
        <Body args={[0.15, 0.1, 0.1]} position={[0, 0.34, 0]} color="#71869b" active={active} runState={runState} />
        <mesh castShadow position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.018, 0.027, 0.12, 16]} />
          <meshStandardMaterial {...metalMaterial} />
        </mesh>
        <TubePath points={[[0, 0.39, -0.04], [-0.08, 0.48, -0.11], [-0.18, 0.42, -0.18]]} active={active} runState={runState} radius={0.006} color="#9fb6c9" />
        <StatusLight active={active} runState={runState} position={[0.052, 0.38, 0.052]} size={0.022} />
      </group>
    </SmallTooltip>
  )
}
