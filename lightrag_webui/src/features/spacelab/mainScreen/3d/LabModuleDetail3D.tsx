import type { DagStep, LabModule } from '../../types'
import LabModule3DScene from './LabModule3DScene'

export default function LabModuleDetail3D({
  module,
  height = 286,
  currentStepId,
  currentStepName,
  dagSteps,
}: {
  module: LabModule
  height?: number | string
  currentStepId?: string
  currentStepName?: string
  dagSteps?: DagStep[]
}) {
  return (
    <LabModule3DScene
      module={module}
      interactive
      autoRotate={false}
      height={height}
      currentStepId={currentStepId}
      currentStepName={currentStepName}
      dagSteps={dagSteps}
    />
  )
}
