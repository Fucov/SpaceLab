import { Body, GlassPane, SmallTooltip, StatusLight, TubePath, type InstrumentProps } from './common'
import { glassMaterial, metalMaterial } from '../materials'

export default function SyringePumpModel({ active = false, runState = 'idle', compact = false, label = '注射泵' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label}>
      <group>
        <Body args={[0.48, 0.22, 0.28]} position={[0, 0.02, 0]} color="#5d6978" active={active} runState={runState} />
        <GlassPane args={[0.32, 0.07, 0.08]} position={[0.1, 0.065, 0.01]} rotation={[0, 0, Math.PI / 2]} opacity={0.46} />
        <mesh castShadow position={[0.29, 0.065, 0.01]}>
          <boxGeometry args={[0.08, 0.08, 0.18]} />
          <meshStandardMaterial {...metalMaterial} />
        </mesh>
        <mesh position={[-0.12, 0.07, 0.15]}>
          <boxGeometry args={[0.16, 0.052, 0.012]} />
          <meshPhysicalMaterial {...glassMaterial} opacity={0.28} />
        </mesh>
        <TubePath points={[[0.28, 0.07, 0.01], [0.42, 0.02, 0.08], [0.58, -0.05, 0.08]]} active={active} runState={runState} />
        <StatusLight active={active} runState={runState} position={[-0.18, 0.15, 0.13]} />
      </group>
    </SmallTooltip>
  )
}
