import { SmallTooltip, TubePath, type InstrumentProps } from './common'
import { glassMaterial, liquidAmberMaterial, liquidBlueMaterial } from '../materials'

export default function BeakerModel({ active = false, runState = 'idle', compact = false, label = '烧杯 / 储液器' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label} position={[0, 0.32, 0]}>
      <group>
        <mesh castShadow position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.12, 0.095, 0.22, 42, 1, true]} />
          <meshPhysicalMaterial {...glassMaterial} opacity={compact ? 0.22 : 0.34} />
        </mesh>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.105, 0.086, 0.09, 42]} />
          <meshPhysicalMaterial {...(active ? liquidBlueMaterial : liquidAmberMaterial)} opacity={0.48} />
        </mesh>
        <mesh position={[0.085, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.038, 0.004, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#d5ebf5" roughness={0.08} transparent opacity={0.55} />
        </mesh>
        {!compact && <TubePath points={[[0.06, 0.22, 0], [0.14, 0.31, 0.08], [0.24, 0.24, 0.1]]} active={active} runState={runState} radius={0.005} />}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.045 + i * 0.045, 0.075 + i * 0.012, 0.01]}>
            <sphereGeometry args={[0.011, 12, 8]} />
            <meshPhysicalMaterial {...liquidBlueMaterial} opacity={0.5} />
          </mesh>
        ))}
      </group>
    </SmallTooltip>
  )
}
