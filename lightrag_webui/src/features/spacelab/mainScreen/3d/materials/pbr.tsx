import type { ReactNode } from 'react'
import type { LabModule } from '../../../types'

export type RunState = 'running' | 'waiting' | 'error' | 'completed' | 'idle'

export const accentByType: Record<LabModule['moduleType'], string> = {
  life_science: '#2fb7a5',
  fluid_physics: '#2f9fca',
  material: '#c58a2b',
  combustion: '#c65a3a',
  earth_observe: '#4caa65',
  bio: '#8765c7',
}

export function activeColor(runState: RunState, accent: string) {
  if (runState === 'error') return '#ef6666'
  if (runState === 'waiting') return '#eabf5a'
  if (runState === 'completed') return '#64a8e8'
  if (runState === 'running') return '#54d3bd'
  return accent
}

export function DeviceMaterial({
  color,
  active = false,
  runState = 'idle',
  metalness = 0.06,
  roughness = 0.52,
  opacity = 1,
  children,
}: {
  color: string
  active?: boolean
  runState?: RunState
  metalness?: number
  roughness?: number
  opacity?: number
  children?: ReactNode
}) {
  const glow = active ? activeColor(runState, color) : '#000000'
  return (
    <meshStandardMaterial
      color={active ? activeColor(runState, color) : color}
      metalness={metalness}
      roughness={roughness}
      transparent={opacity < 1}
      opacity={opacity}
      emissive={glow}
      emissiveIntensity={active ? 0.18 : 0}
    >
      {children}
    </meshStandardMaterial>
  )
}

export function GlassMaterial({ tint = '#b8dfee', opacity = 0.26 }: { tint?: string; opacity?: number }) {
  return (
    <meshPhysicalMaterial
      color={tint}
      roughness={0.05}
      metalness={0}
      transmission={0.64}
      thickness={0.42}
      envMapIntensity={1.5}
      clearcoat={0.82}
      clearcoatRoughness={0.08}
      transparent
      opacity={opacity}
    />
  )
}

export function MetalMaterial({ color = '#7e8895', roughness = 0.34 }: { color?: string; roughness?: number }) {
  return <meshStandardMaterial color={color} metalness={0.78} roughness={roughness} envMapIntensity={1.25} />
}

export function PlasticMaterial({ color = '#586575' }: { color?: string }) {
  return <meshStandardMaterial color={color} metalness={0.03} roughness={0.58} envMapIntensity={0.85} />
}

export function ScreenMaterial({ color = '#081827', active = false }: { color?: string; active?: boolean }) {
  return <meshStandardMaterial color={color} roughness={0.22} metalness={0.02} emissive={active ? '#38d5c6' : '#143045'} emissiveIntensity={active ? 0.55 : 0.18} />
}

export function LiquidMaterial({ color = '#63d5e8', opacity = 0.5 }: { color?: string; opacity?: number }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.03}
      transmission={0.42}
      thickness={0.18}
      transparent
      opacity={opacity}
      envMapIntensity={1.2}
    />
  )
}
