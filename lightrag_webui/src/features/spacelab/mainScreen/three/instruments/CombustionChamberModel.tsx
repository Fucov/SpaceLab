import { ActiveOutline, GlassPane, MetalRod, SmallTooltip, StatusLight, TubePath, type InstrumentProps } from './common'
import { darkMetalMaterial, liquidAmberMaterial, metalMaterial } from '../materials'

export default function CombustionChamberModel({ active = false, runState = 'idle', compact = false, label = '透明燃烧室' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label} position={[0, 0.44, 0]}>
      <group>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.48, 42, 1, true]} />
          <meshPhysicalMaterial color="#d4e9f5" roughness={0.04} transmission={0.58} clearcoat={0.9} transparent opacity={compact ? 0.22 : 0.32} />
        </mesh>
        <GlassPane args={[0.42, 0.035, 0.42]} position={[0, -0.28, 0]} opacity={0.18} />
        <mesh position={[0, -0.01, 0]}>
          <sphereGeometry args={[0.062, 22, 14]} />
          <meshPhysicalMaterial {...liquidAmberMaterial} color="#f2a766" emissive="#c65a3a" emissiveIntensity={active ? 0.34 : 0.09} opacity={0.5} />
        </mesh>
        <mesh position={[-0.28, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.052, 0.24, 20]} />
          <meshStandardMaterial {...darkMetalMaterial} color="#c65a3a" />
        </mesh>
        <MetalRod position={[0.18, 0.08, 0]} rotation={[0, 0, Math.PI / 4]} length={0.34} radius={0.01} />
        <TubePath points={[[0.04, 0.22, 0.24], [0.32, 0.2, 0.34], [0.48, 0.02, 0.24]]} active={active} runState={runState} color="#a8b4c4" />
        <mesh position={[0.34, 0.02, 0.2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.05, 18]} />
          <meshStandardMaterial {...metalMaterial} />
        </mesh>
        <StatusLight active={active} runState={runState} position={[0.22, 0.25, 0.18]} />
        <ActiveOutline active={active} runState={runState} position={[0, 0.32, 0]} radius={0.28} />
      </group>
    </SmallTooltip>
  )
}
