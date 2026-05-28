import { Body, SmallTooltip, type InstrumentProps } from './common'
import { glassMaterial, liquidBlueMaterial, liquidAmberMaterial, metalMaterial } from '../materials'

export default function TestTubeRackModel({ active = false, runState = 'idle', compact = false, label = '样品试管架' }: InstrumentProps) {
  const tubes = compact ? [-0.12, 0, 0.12] : [-0.18, -0.06, 0.06, 0.18]
  return (
    <SmallTooltip compact={compact} label={label} position={[0, 0.32, 0]}>
      <group>
        <Body args={[0.48, 0.065, 0.25]} position={[0, 0, 0]} color="#4b5563" active={active} runState={runState} />
        <Body args={[0.5, 0.028, 0.27]} position={[0, 0.17, 0]} color="#6b7280" active={active} runState={runState} radius={0.01} />
        {[-0.23, 0.23].map((x) => (
          <mesh key={x} castShadow position={[x, 0.08, -0.09]}>
            <boxGeometry args={[0.03, 0.18, 0.028]} />
            <meshStandardMaterial {...metalMaterial} />
          </mesh>
        ))}
        {tubes.map((x, i) => (
          <group key={x} position={[x, 0.12, 0.02]}>
            <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.024, 0.032, 0.2, 20]} />
              <meshPhysicalMaterial {...glassMaterial} opacity={0.34} />
            </mesh>
            <mesh position={[0, -0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.019, 0.024, 0.12, 20]} />
              <meshPhysicalMaterial {...(i % 2 ? liquidAmberMaterial : liquidBlueMaterial)} opacity={0.62} />
            </mesh>
          </group>
        ))}
      </group>
    </SmallTooltip>
  )
}
