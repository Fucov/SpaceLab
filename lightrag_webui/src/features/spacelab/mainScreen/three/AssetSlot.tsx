import { Component, type ErrorInfo, type ReactNode, Suspense } from 'react'
import { Clone, useGLTF } from '@react-three/drei'
import { SmallTooltip } from './instruments/common'

export type AssetSlotProps = {
  url: string
  fallback: ReactNode
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  label?: string
  compact?: boolean
}

class SlotErrorBoundary extends Component<{ fallback: ReactNode; url: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[spacelab] GLB asset unavailable, using fallback: ${this.props.url}`, error, info.componentStack)
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

function GLBModel({ url, scale }: { url: string; scale?: AssetSlotProps['scale'] }) {
  const gltf = useGLTF(url)
  return <Clone object={gltf.scene} scale={scale ?? 1} />
}

export function AssetSlot({ url, fallback, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, label, compact = false }: AssetSlotProps) {
  const model = <GLBModel url={url} scale={scale} />
  return (
    <group position={position} rotation={rotation}>
      <SlotErrorBoundary key={url} url={url} fallback={fallback}>
        <Suspense fallback={fallback}>
          {label ? <SmallTooltip label={label} compact={compact}>{model}</SmallTooltip> : model}
        </Suspense>
      </SlotErrorBoundary>
    </group>
  )
}
