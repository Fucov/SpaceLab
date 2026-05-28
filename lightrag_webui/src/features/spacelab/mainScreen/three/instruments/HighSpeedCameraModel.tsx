import { Body, MetalRod, OledPanel, SmallTooltip, StatusLight, type InstrumentProps } from './common'
import { darkMetalMaterial, glassMaterial } from '../materials'

export default function HighSpeedCameraModel({ active = false, runState = 'idle', compact = false, label = '高速摄像机' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label}>
      <group>
        <Body args={[0.32, 0.2, 0.22]} color="#465365" active={active} runState={runState} />
        <MetalRod position={[0, -0.18, 0]} length={0.34} radius={0.025} />
        <mesh castShadow position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.045, 28]} />
          <meshStandardMaterial {...darkMetalMaterial} />
        </mesh>
        <mesh position={[0, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.112, 0.18, 32]} />
          <meshStandardMaterial {...darkMetalMaterial} color={active ? '#334155' : '#1f2937'} />
        </mesh>
        <mesh position={[0, 0, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.018, 32]} />
          <meshPhysicalMaterial {...glassMaterial} color="#99d7ff" opacity={0.52} />
        </mesh>
        <OledPanel active={active} position={[-0.01, 0.072, -0.116]} rotation={[0, Math.PI, 0]} size={[0.15, 0.052]} />
        <StatusLight active={active} runState={runState} position={[-0.12, 0.08, 0.13]} />
      </group>
    </SmallTooltip>
  )
}
