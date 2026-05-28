import { AccumulativeShadows, Environment, Lightformer, RandomizedLight } from '@react-three/drei'

export function StudioLighting({ compact = false, accent = '#54d3bd' }: { compact?: boolean; accent?: string }) {
  return (
    <>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 5.4, 8.5]} />
      <Environment resolution={128} environmentIntensity={compact ? 0.78 : 1.05}>
        <Lightformer form="rect" intensity={3.4} position={[0, 3.2, 3.8]} scale={[4, 1.4, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-3, 1.4, 1.6]} rotation-y={0.6} scale={[1.4, 2.4, 1]} />
        <Lightformer form="ring" intensity={1.1} color={accent} position={[2.8, 1.1, -2.2]} scale={[1.8, 1.8, 1]} />
      </Environment>
      <ambientLight intensity={compact ? 0.24 : 0.2} />
      <hemisphereLight args={['#d9ecff', '#1a2633', compact ? 0.72 : 0.6]} />
      <directionalLight castShadow position={[3.2, 4.2, 3.4]} intensity={compact ? 1.45 : 1.85} shadow-mapSize-width={compact ? 1024 : 2048} shadow-mapSize-height={compact ? 1024 : 2048} />
      <directionalLight position={[-2.8, 1.4, -2.2]} intensity={compact ? 0.42 : 0.58} color="#c9ddff" />
      <pointLight position={[0.6, 1.1, 1.9]} intensity={compact ? 0.28 : 0.42} color={accent} />
      {!compact && (
        <AccumulativeShadows temporal frames={32} alphaTest={0.72} opacity={0.38} scale={4.2} position={[0, -0.93, 0]}>
          <RandomizedLight amount={6} radius={2.2} ambient={0.45} intensity={1.1} position={[2.5, 4.2, 2.2]} />
        </AccumulativeShadows>
      )}
    </>
  )
}
