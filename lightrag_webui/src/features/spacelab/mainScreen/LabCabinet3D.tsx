import type { DagStep, LabModule } from '../types'
import LabModule3DScene from './3d/LabModule3DScene'

interface LabCabinet3DProps {
  module: LabModule
  compact?: boolean
  interactive?: boolean
  autoRotate?: boolean
  height?: number | string
  currentStepId?: string
  currentStepName?: string
  dagSteps?: DagStep[]
}

export default function LabCabinet3D(props: LabCabinet3DProps) {
  return <LabModule3DScene {...props} />
}
