import { ActiveOutline, Body, GlassPane, SmallTooltip, StatusLight, TubePath, type InstrumentProps } from './common'
import { liquidBlueMaterial, liquidAmberMaterial } from '../materials'

export default function ElectrophoresisTankModel({ active = false, runState = 'idle', compact = false, label = 'SDS-PAGE电泳槽' }: InstrumentProps) {
  const error = runState === 'error'
  return (
    <SmallTooltip compact={compact} label={label} position={[0, 0.34, 0]}>
      <group>
        <GlassPane args={[0.62, 0.18, 0.38]} position={[0, 0.03, 0]} opacity={compact ? 0.26 : 0.38} />
        <mesh position={[0, 0.035, 0.02]}>
          <boxGeometry args={[0.45, 0.044, 0.25]} />
          <meshPhysicalMaterial {...(error ? liquidAmberMaterial : liquidBlueMaterial)} color={error ? '#ef6666' : '#8765c7'} opacity={0.6} />
        </mesh>
        {[-0.18, -0.09, 0, 0.09, 0.18].map((x) => (
          <mesh key={x} castShadow position={[x, 0.105, 0.18]}>
            <boxGeometry args={[0.018, 0.085, 0.016]} />
            <meshStandardMaterial color={x < 0 ? '#ef4444' : '#111827'} roughness={0.36} metalness={0.28} />
          </mesh>
        ))}
        <Body args={[0.18, 0.08, 0.08]} position={[-0.36, 0.02, 0.03]} color="#374151" active={active || error} runState={runState} />
        <Body args={[0.18, 0.08, 0.08]} position={[0.36, 0.02, 0.03]} color="#374151" active={active || error} runState={runState} />
        <TubePath points={[[-0.34, 0.07, 0.12], [-0.22, 0.2, 0.2], [0.32, 0.12, 0.16]]} color="#ef4444" active={active || error} runState={runState} radius={0.006} />
        <TubePath points={[[-0.34, 0.02, -0.12], [-0.18, 0.17, -0.2], [0.32, 0.08, -0.14]]} color="#1f2937" active={active || error} runState={runState} radius={0.006} />
        <StatusLight active={active || error} runState={runState} position={[-0.27, 0.12, -0.12]} />
        <ActiveOutline active={active || error} runState={runState} position={[0, 0.22, 0]} radius={0.31} />
      </group>
    </SmallTooltip>
  )
}
