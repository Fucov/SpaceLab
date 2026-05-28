import { ActiveOutline, SmallTooltip, type InstrumentProps } from './common'
import { agarMaterial, glassMaterial, liquidBlueMaterial } from '../materials'

export default function PetriDishModel({ active = false, runState = 'idle', compact = false, label = '培养皿阵列' }: InstrumentProps) {
  const dishes = compact ? [-0.13, 0.13] : [-0.22, 0, 0.22]
  return (
    <SmallTooltip compact={compact} label={label} position={[0, 0.22, 0]}>
      <group>
        {dishes.map((x, i) => (
          <group key={x} position={[x, 0, i % 2 ? 0.04 : -0.04]}>
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.095, 0.095, 0.018, 42]} />
              <meshPhysicalMaterial {...glassMaterial} opacity={compact ? 0.24 : 0.34} />
            </mesh>
            <mesh position={[0, 0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.078, 0.078, 0.01, 42]} />
              <meshPhysicalMaterial {...agarMaterial} color={i % 2 ? '#d4eee2' : '#b8efe1'} />
            </mesh>
            {!compact && [0, 1, 2].map((n) => (
              <mesh key={n} position={[-0.035 + n * 0.034, 0.025, 0.012 - n * 0.01]}>
                <sphereGeometry args={[0.009, 12, 8]} />
                <meshPhysicalMaterial {...liquidBlueMaterial} opacity={0.6} />
              </mesh>
            ))}
          </group>
        ))}
        <ActiveOutline active={active} runState={runState} position={[0, 0.09, 0]} radius={0.28} />
      </group>
    </SmallTooltip>
  )
}
