import { useNavigate } from 'react-router-dom'
import MacroData from './tabletScreen/MacroData'
import LabModuleInfo from './tabletScreen/LabModuleInfo'
import KnowledgeGraph from './tabletScreen/KnowledgeGraph'
import DocumentImport from './tabletScreen/DocumentImport'
import AiAssistant from './tabletScreen/AiAssistant'
import { ArrowLeftIcon, TabletIcon } from 'lucide-react'

export default function TabletApp() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f8fafc]">
      {/* Top bar */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/spacelab')}
            className="cursor-pointer flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
          >
            <ArrowLeftIcon className="w-3 h-3" />
            返回
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <TabletIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">天宫平板终端</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>LightRAG 检索增强</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            已连接
          </span>
        </div>
      </header>

      {/* Main content - 2 column layout (3:7) */}
      <div className="flex flex-1 min-h-0 gap-3 p-3">
        {/* Left sidebar - 30% */}
        <div className="w-[30%] min-w-[240px] flex flex-col gap-3 overflow-y-auto">
          <MacroData />
          <LabModuleInfo />
          <KnowledgeGraph />
          <DocumentImport />
        </div>

        {/* Right main - 70% */}
        <div className="flex-1 min-w-0">
          <AiAssistant />
        </div>
      </div>
    </div>
  )
}
