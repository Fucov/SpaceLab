import type { LabModule } from '../../types'
import LabModule3DScene from './LabModule3DScene'

export default function LabModulePreview3D({ module, height = '100%' }: { module: LabModule; height?: number | string }) {
  return <LabModule3DScene module={module} compact height={height} autoRotate={false} />
}
