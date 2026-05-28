import { Body, OledPanel, SmallTooltip, StatusLight, TubePath, type InstrumentProps } from './common'
import { glassMaterial } from '../materials'

export default function SpectrometerModel({ active = false, runState = 'idle', compact = false, label = '光谱仪模块' }: InstrumentProps) {
  return (
    <SmallTooltip compact={compact} label={label}>
      <group>
        <Body args={[0.44, 0.22, 0.34]} color="#31495a" active={active} runState={runState} />
        <OledPanel active={active} position={[0, 0.04, 0.178]} size={[0.28, 0.048]} />
        {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
          <mesh key={x} castShadow position={[x, 0.14, 0.18]}>
            <boxGeometry args={[0.055, 0.035, 0.012]} />
            <meshStandardMaterial color={i === 1 ? '#4caa65' : '#8aa4bd'} roughness={0.42} metalness={0.08} />
          </mesh>
        ))}
        <mesh position={[-0.25, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.095, 0.18, 28]} />
          <meshPhysicalMaterial {...glassMaterial} opacity={0.48} />
        </mesh>
        <TubePath points={[[-0.05, -0.13, 0.03], [0.16, -0.22, 0.07], [0.42, -0.1, 0.04]]} active={active} runState={runState} color="#86efac" />
        <StatusLight active={active} runState={runState} position={[0.17, 0.14, -0.15]} />
      </group>
    </SmallTooltip>
  )
}
