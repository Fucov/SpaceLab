import { useMemo, useRef, useState } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, CatmullRomCurve3, Vector3, type Mesh } from 'three'
import {
  activeColor,
  cableMaterial,
  darkMetalMaterial,
  deviceMaterial,
  glassMaterial,
  metalMaterial,
  oledMaterial,
  plasticMaterial,
  statusLightMaterial,
  type RunState,
} from '../materials'

export type InstrumentProps = {
  active?: boolean
  runState?: RunState
  compact?: boolean
  label?: string
}

export function Body({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = '#5d6b7d',
  active = false,
  runState = 'idle',
  radius = 0.018,
}: InstrumentProps & {
  args: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  color?: string
  radius?: number
}) {
  return (
    <RoundedBox castShadow receiveShadow position={position} rotation={rotation} args={args} radius={radius} smoothness={4}>
      <meshStandardMaterial {...deviceMaterial(color, active, runState)} />
    </RoundedBox>
  )
}

export function StatusLight({
  active = false,
  runState = 'idle',
  position,
  size = 0.026,
  accent,
}: InstrumentProps & { position: [number, number, number]; size?: number; accent?: string }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.scale.setScalar(active ? 0.92 + Math.sin(clock.getElapsedTime() * 4.2) * 0.08 : 0.75)
  })
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 18, 12]} />
      <meshStandardMaterial {...statusLightMaterial(runState, active, accent)} />
    </mesh>
  )
}

export function ActiveOutline({ active = false, runState = 'idle', position = [0, 0, 0], radius = 0.2 }: InstrumentProps & { position?: [number, number, number]; radius?: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 2.7) * 0.035)
  })
  if (!active) return null
  const color = activeColor(runState)
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.007, 10, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.34} transparent opacity={0.58} />
    </mesh>
  )
}

export function TubePath({
  points,
  active = false,
  runState = 'idle',
  color = '#65d4e7',
  radius = 0.009,
}: InstrumentProps & { points: [number, number, number][]; color?: string; radius?: number }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p))), [points])
  const signal = active ? activeColor(runState, color) : color
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 36, active ? radius * 1.25 : radius, 10, false]} />
      <meshStandardMaterial {...cableMaterial} color={signal} emissive={active ? signal : '#000000'} emissiveIntensity={active ? 0.16 : 0} transparent opacity={active ? 0.92 : 0.58} />
    </mesh>
  )
}

export function SmallTooltip({
  label,
  compact = false,
  children,
  position = [0, 0.42, 0],
}: InstrumentProps & { children: React.ReactNode; position?: [number, number, number] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {children}
      {!compact && hovered && label && (
        <Html position={position} center distanceFactor={8}>
          <div className="pointer-events-none whitespace-nowrap rounded border border-white/15 bg-slate-950/85 px-1.5 py-0.5 text-[9px] text-slate-200 shadow-lg shadow-black/30">{label}</div>
        </Html>
      )}
    </group>
  )
}

export function OledPanel({ active = false, position = [0, 0, 0], rotation = [0, 0, 0], size = [0.18, 0.064] }: InstrumentProps & { position?: [number, number, number]; rotation?: [number, number, number]; size?: [number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#061724'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = active ? '#5eead4' : '#24536a'
    ctx.lineWidth = 3
    ctx.strokeRect(8, 8, 144, 48)
    ctx.fillStyle = active ? '#5eead4' : '#315c70'
    for (let i = 0; i < 5; i++) ctx.fillRect(22 + i * 23, 24 + (i % 2) * 8, 14, 4)
    const texture = new CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [active])

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[size[0], size[1], 0.012]} />
      <meshStandardMaterial {...oledMaterial} emissive={active ? '#38d5c6' : '#143045'} emissiveIntensity={active ? 0.5 : 0.16} map={texture} />
    </mesh>
  )
}

export function GlassPane({ args, position = [0, 0, 0], rotation = [0, 0, 0], opacity }: { args: [number, number, number]; position?: [number, number, number]; rotation?: [number, number, number]; opacity?: number }) {
  return (
    <RoundedBox castShadow receiveShadow position={position} rotation={rotation} args={args} radius={0.012} smoothness={3}>
      <meshPhysicalMaterial {...glassMaterial} opacity={opacity ?? glassMaterial.opacity} />
    </RoundedBox>
  )
}

export function MetalRod({ position, rotation = [0, 0, 0], length = 0.3, radius = 0.014, dark = false }: { position: [number, number, number]; rotation?: [number, number, number]; length?: number; radius?: number; dark?: boolean }) {
  return (
    <mesh castShadow position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 18]} />
      <meshStandardMaterial {...(dark ? darkMetalMaterial : metalMaterial)} />
    </mesh>
  )
}

export function PlasticBase({ args, position = [0, 0, 0], rotation = [0, 0, 0], color = plasticMaterial.color }: { args: [number, number, number]; position?: [number, number, number]; rotation?: [number, number, number]; color?: string }) {
  return (
    <RoundedBox castShadow receiveShadow position={position} rotation={rotation} args={args} radius={0.016} smoothness={3}>
      <meshStandardMaterial {...plasticMaterial} color={color} />
    </RoundedBox>
  )
}
