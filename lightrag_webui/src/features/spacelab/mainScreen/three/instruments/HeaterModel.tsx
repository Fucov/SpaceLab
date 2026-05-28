import { ActiveOutline, Body, OledPanel, SmallTooltip, StatusLight, TubePath, type InstrumentProps } from './common'
import { darkMetalMaterial, liquidAmberMaterial, metalMaterial } from '../materials'

export default function HeaterModel({ active = false, runState = 'idle', compact = false, label = '小型加热炉' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label} position={[0, 0.42, 0]}>
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.34, 40]} />
          <meshStandardMaterial {...darkMetalMaterial} color={active ? '#66533f' : '#4b4f58'} />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.044, 36]} />
          <meshStandardMaterial {...metalMaterial} color="#7d8794" />
        </mesh>
        <mesh position={[0, -0.02, 0.232]}>
          <boxGeometry args={[0.22, 0.12, 0.018]} />
          <meshPhysicalMaterial {...liquidAmberMaterial} emissive="#c58a2b" emissiveIntensity={active ? 0.35 : 0.08} opacity={0.82} />
        </mesh>
        <Body args={[0.38, 0.075, 0.18]} position={[0, -0.22, 0]} color="#69717c" active={active} runState={runState} />
        <OledPanel active={active} position={[0, -0.2, 0.095]} size={[0.16, 0.044]} />
        <TubePath points={[[0.18, 0.07, 0.14], [0.34, 0.12, 0.2], [0.42, -0.08, 0.12]]} active={active} runState={runState} color="#77c9d3" />
        <StatusLight active={active} runState={runState} position={[0.17, 0.08, 0.19]} />
        <ActiveOutline active={active} runState={runState} position={[0, 0.27, 0]} radius={0.26} />
      </group>
    </SmallTooltip>
  )
}
