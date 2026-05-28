import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import type { LabModule } from '../types'

interface LabCabinet3DProps {
  module: LabModule
  compact?: boolean
  interactive?: boolean
  autoRotate?: boolean
  height?: number | string
}

const accentByType: Record<LabModule['moduleType'], string> = {
  life_science: '#2fb7a5',
  fluid_physics: '#2f9fca',
  material: '#c58a2b',
  combustion: '#c65a3a',
  earth_observe: '#4caa65',
  bio: '#8765c7',
}

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

function CabinetFallback({ module }: { module: LabModule }) {
  const accent = accentByType[module.moduleType]
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded border border-white/10 bg-black/20">
      <svg viewBox="0 0 150 210" className="h-[92%] max-h-full">
        <rect x="36" y="14" width="78" height="182" rx="5" fill="#172033" stroke="#40516c" strokeWidth="2" />
        <rect x="45" y="28" width="60" height="150" rx="3" fill="#101827" stroke={accent} strokeOpacity="0.55" />
        <rect x="56" y="42" width="38" height="28" rx="3" fill="#263449" stroke="#617089" />
        <circle cx="52" cy="86" r="4" fill={module.status === 'error' ? '#ef4444' : module.status === 'running' ? '#34d399' : '#64748b'} />
        {[0, 1, 2].map((i) => (
          <rect key={i} x="55" y={102 + i * 22} width="40" height="12" rx="2" fill="#202b3d" stroke="#526176" />
        ))}
        <path d="M103 86 C130 90 128 138 103 142" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  )
}

function CabinetModel({ module, compact = false, autoRotate = false }: Pick<LabCabinet3DProps, 'module' | 'compact' | 'autoRotate'>) {
  const groupRef = useRef<Group>(null)
  const accent = accentByType[module.moduleType]
  const statusColor = module.status === 'error'
    ? '#ef4444'
    : module.status === 'running'
    ? '#34d399'
    : module.status === 'completed'
    ? '#60a5fa'
    : '#94a3b8'

  const drawerYs = useMemo(() => compact ? [-0.3, -0.55, -0.8] : [-0.2, -0.48, -0.76, -1.04], [compact])

  useFrame((_, delta) => {
    if (!groupRef.current || (!autoRotate && !compact)) return
    groupRef.current.rotation.y += delta * (compact ? 0.35 : 0.22)
  })

  return (
    <group ref={groupRef} rotation={[0.04, compact ? -0.35 : -0.25, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.26, 2.15, 0.62]} />
        <meshStandardMaterial color="#1b2535" roughness={0.82} metalness={0.22} />
      </mesh>

      <mesh position={[0, 0, 0.323]}>
        <boxGeometry args={[1.08, 1.9, 0.035]} />
        <meshStandardMaterial color="#111827" roughness={0.76} metalness={0.12} />
      </mesh>

      <mesh position={[0, 0, 0.347]}>
        <boxGeometry args={[0.98, 1.72, 0.018]} />
        <meshStandardMaterial color={accent} roughness={0.64} metalness={0.2} transparent opacity={0.22} />
      </mesh>

      {[
        [0, 0.91, 0.37, 1.06, 0.035],
        [0, -0.91, 0.37, 1.06, 0.035],
        [-0.54, 0, 0.37, 0.035, 1.86],
        [0.54, 0, 0.37, 0.035, 1.86],
      ].map(([x, y, z, w, h], index) => (
        <mesh key={index} position={[x, y, z]}>
          <boxGeometry args={[w, h, 0.035]} />
          <meshStandardMaterial color="#506078" roughness={0.7} metalness={0.35} />
        </mesh>
      ))}

      <mesh position={[-0.18, 0.52, 0.39]}>
        <boxGeometry args={[0.52, 0.34, 0.035]} />
        <meshStandardMaterial color="#243449" roughness={0.36} metalness={0.08} transparent opacity={0.82} />
      </mesh>
      <mesh position={[-0.18, 0.52, 0.411]}>
        <boxGeometry args={[0.4, 0.21, 0.012]} />
        <meshStandardMaterial color={accent} roughness={0.45} transparent opacity={0.34} />
      </mesh>

      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.36, 0.67 - i * 0.15, 0.405]}>
          <sphereGeometry args={[0.035, compact ? 12 : 16, compact ? 8 : 12]} />
          <meshStandardMaterial color={i === 0 ? statusColor : i === 1 ? accent : '#64748b'} roughness={0.5} emissive={i === 0 ? statusColor : '#000000'} emissiveIntensity={i === 0 && module.status === 'running' ? 0.45 : 0.12} />
        </mesh>
      ))}

      {drawerYs.map((y, i) => (
        <group key={i}>
          <mesh position={[-0.12, y, 0.392]}>
            <boxGeometry args={[0.72, 0.15, 0.04]} />
            <meshStandardMaterial color="#202b3d" roughness={0.75} metalness={0.18} />
          </mesh>
          <mesh position={[0.19, y, 0.424]}>
            <boxGeometry args={[0.18, 0.025, 0.025]} />
            <meshStandardMaterial color="#7d8aa0" roughness={0.55} metalness={0.45} />
          </mesh>
        </group>
      ))}

      <mesh position={[0.5, -0.55, 0.41]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.5, compact ? 10 : 16]} />
        <meshStandardMaterial color={accent} roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh position={[0.5, -0.82, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.12, compact ? 12 : 18]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.45} />
      </mesh>
      <mesh position={[0.5, -1.0, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.12, compact ? 12 : 18]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.45} />
      </mesh>

      <mesh position={[0, -1.12, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.78]} />
        <meshStandardMaterial color="#263246" roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  )
}

export default function LabCabinet3D({
  module,
  compact = false,
  interactive = false,
  autoRotate = compact,
  height = compact ? 132 : 260,
}: LabCabinet3DProps) {
  const style = typeof height === 'number' ? { height: `${height}px` } : { height }

  if (!webglAvailable()) {
    return (
      <div style={style}>
        <CabinetFallback module={module} />
      </div>
    )
  }

  return (
    <div style={style} className="overflow-hidden rounded border border-white/10 bg-black/20">
      <Suspense fallback={<CabinetFallback module={module} />}>
        <Canvas
          camera={{ position: compact ? [0, 0.2, 4.2] : [0, 0.15, 4.0], fov: compact ? 30 : 34 }}
          dpr={compact ? [1, 1.25] : [1, 1.75]}
          gl={{ antialias: !compact, alpha: true, powerPreference: compact ? 'low-power' : 'high-performance' }}
        >
          <ambientLight intensity={compact ? 0.95 : 0.75} />
          <directionalLight position={[2.5, 3, 4]} intensity={compact ? 1.4 : 1.8} />
          {!compact && <pointLight position={[-2, 1.5, 2]} intensity={0.45} color={accentByType[module.moduleType]} />}
          <CabinetModel module={module} compact={compact} autoRotate={autoRotate} />
          {interactive && (
            <OrbitControls
              enableDamping
              enablePan
              enableZoom
              minDistance={2.6}
              maxDistance={6}
              target={[0, 0, 0]}
            />
          )}
        </Canvas>
      </Suspense>
    </div>
  )
}
