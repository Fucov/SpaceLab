import { Clone, useGLTF } from '@react-three/drei'
import anchorUrl from '../../../assets/models/instrument_anchor.gltf?url'

export function AssetModel({ url = anchorUrl, scale = 1 }: { url?: string; scale?: number }) {
  const gltf = useGLTF(url)
  return <Clone object={gltf.scene} scale={scale} />
}

useGLTF.preload(anchorUrl)
