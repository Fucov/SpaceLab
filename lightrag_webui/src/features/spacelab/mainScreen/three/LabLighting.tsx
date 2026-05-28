import { ContactShadows, Environment, Lightformer } from '@react-three/drei'

export function LabLighting({ compact = false, accent = '#54d3bd' }: { compact?: boolean; accent?: string }) {
  return (
    <>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 5.8, 9]} />
      <Environment resolution={compact ? 64 : 128} environmentIntensity={compact ? 0.92 : 1.18}>
        <Lightformer form="rect" intensity={compact ? 3.2 : 4.2} position={[0, 3.2, 3.6]} scale={[4.5, 1.5, 1]} />
        {!compact && <Lightformer form="rect" intensity={1.9} position={[-3, 1.5, 1.8]} rotation-y={0.6} scale={[1.4, 2.5, 1]} />}
        {!compact && <Lightformer form="ring" intensity={1.2} color={accent} position={[2.8, 1.2, -2]} scale={[1.8, 1.8, 1]} />}
      </Environment>
      <ambientLight intensity={compact ? 0.36 : 0.28} />
      <hemisphereLight args={['#e5f4ff', '#1b2633', compact ? 0.9 : 0.76]} />
      <directionalLight
        castShadow
        position={[3.4, 4.4, 3.6]}
        intensity={compact ? 1.65 : 2.05}
        shadow-mapSize-width={compact ? 1024 : 2048}
        shadow-mapSize-height={compact ? 1024 : 2048}
      />
      <directionalLight position={[-2.9, 1.5, -2.2]} intensity={compact ? 0.58 : 0.72} color="#d6e5ff" />
      {!compact && <rectAreaLight position={[0, 1.25, 1.7]} rotation={[-0.6, 0, 0]} width={2.6} height={0.55} intensity={1.45} color="#dff7ff" />}
      {!compact && <pointLight position={[0.65, 1.05, 1.85]} intensity={0.28} color={accent} />}
    </>
  )
}

export function LabContactShadows({ compact = false }: { compact?: boolean }) {
  return <ContactShadows position={[0, -0.91, 0]} opacity={compact ? 0.25 : 0.42} scale={3.5} blur={compact ? 1.35 : 2.25} far={1.8} />
}
