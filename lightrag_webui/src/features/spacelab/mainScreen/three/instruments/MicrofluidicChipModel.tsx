import { ActiveOutline, GlassPane, SmallTooltip, TubePath, type InstrumentProps } from './common'
import { liquidBlueMaterial } from '../materials'

export default function MicrofluidicChipModel({ active = false, runState = 'idle', compact = false, label = '微流控芯片' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label} position={[0, 0.26, 0]}>
      <group>
        <GlassPane args={[0.72, 0.048, 0.36]} position={[0, 0, 0]} opacity={compact ? 0.25 : 0.36} />
        <TubePath points={[[-0.29, 0.032, -0.08], [-0.08, 0.038, -0.08], [0.02, 0.038, 0.06], [0.25, 0.038, 0.06]]} active={active} runState={runState} radius={0.005} />
        <TubePath points={[[-0.25, 0.033, 0.1], [-0.08, 0.038, 0.02], [0.18, 0.038, -0.08], [0.31, 0.038, -0.08]]} active={active} runState={runState} radius={0.0045} color="#8ee6d6" />
        {[-0.28, 0.28, -0.09, 0.09].map((x, i) => (
          <mesh key={i} position={[x, 0.054, i < 2 ? -0.08 : 0.06]}>
            <sphereGeometry args={[0.023, 18, 12]} />
            <meshPhysicalMaterial {...liquidBlueMaterial} opacity={active ? 0.74 : 0.48} />
          </mesh>
        ))}
        <ActiveOutline active={active} runState={runState} position={[0.02, 0.16, 0]} radius={0.25} />
      </group>
    </SmallTooltip>
  )
}
