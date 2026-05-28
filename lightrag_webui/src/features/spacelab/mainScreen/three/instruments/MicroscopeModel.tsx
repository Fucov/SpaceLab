import { ActiveOutline, Body, GlassPane, MetalRod, OledPanel, SmallTooltip, StatusLight, type InstrumentProps } from './common'
import { darkMetalMaterial, glassMaterial, metalMaterial, whitePlasticMaterial } from '../materials'

export default function MicroscopeModel({ active = false, runState = 'idle', compact = false, label = '显微成像模块' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label}>
      <group>
        <Body args={[0.38, 0.07, 0.3]} position={[0, -0.02, 0]} color="#475569" active={active} runState={runState} />
        <MetalRod position={[-0.12, 0.17, 0]} length={0.42} radius={0.024} />
        <Body args={[0.22, 0.11, 0.16]} position={[0.02, 0.36, 0]} color="#e1e6eb" active={active} runState={runState} />
        <mesh castShadow position={[0.06, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.068, 0.18, 32]} />
          <meshStandardMaterial {...darkMetalMaterial} />
        </mesh>
        <mesh position={[0.06, 0.11, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.044, 0.044, 0.018, 32]} />
          <meshPhysicalMaterial {...glassMaterial} opacity={0.5} />
        </mesh>
        <GlassPane args={[0.21, 0.018, 0.15]} position={[0.05, 0.07, 0.02]} opacity={compact ? 0.38 : 0.54} />
        <mesh castShadow position={[0.17, 0.1, 0]}>
          <cylinderGeometry args={[0.034, 0.034, 0.052, 20]} />
          <meshStandardMaterial {...whitePlasticMaterial} />
        </mesh>
        <OledPanel active={active} position={[-0.07, 0.0, 0.155]} size={[0.15, 0.045]} />
        <StatusLight active={active} runState={runState} position={[0.13, 0.41, 0.08]} />
        <ActiveOutline active={active} runState={runState} position={[0.02, 0.5, 0]} radius={0.16} />
      </group>
    </SmallTooltip>
  )
}
