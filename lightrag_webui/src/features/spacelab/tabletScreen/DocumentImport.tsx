import { useState, useCallback } from 'react'
import { useSpaceLabStore } from '../store'
import { uploadDocument } from '@/api/lightrag'
import { toast } from 'sonner'

export default function DocumentImport() {
  const documents = useSpaceLabStore((s) => s.documents)
  const addDocument = useSpaceLabStore((s) => s.addDocument)
  const updateDocumentStatus = useSpaceLabStore((s) => s.updateDocumentStatus)
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const docId = `doc-${Date.now()}`
    addDocument({
      id: docId,
      name: file.name,
      status: 'processing',
      uploadTime: new Date().toLocaleString('zh-CN'),
      size: `${(file.size / 1024).toFixed(1)}KB`,
    })
    setUploading(true)

    try {
      await uploadDocument(file)
      updateDocumentStatus(docId, 'processed')
      toast.success(`文档 ${file.name} 已处理完成`)
    } catch {
      updateDocumentStatus(docId, 'error')
      toast.error(`文档 ${file.name} 上传失败`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [addDocument, updateDocumentStatus])

  const statusLabel: Record<string, { text: string; cls: string }> = {
    processing: { text: '处理中', cls: 'bg-amber-50 text-amber-600' },
    processed: { text: '已索引', cls: 'bg-green-50 text-green-600' },
    error: { text: '失败', cls: 'bg-red-50 text-red-600' },
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 mb-2 tracking-wider uppercase">知识导入与索引</h3>

      {/* Upload button */}
      <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 px-3 py-3 text-xs text-blue-500 transition-colors hover:bg-blue-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {uploading ? '上传中...' : '上传文档 (TXT/PDF)'}
        <input type="file" accept=".txt,.pdf,.md" className="hidden" onChange={handleUpload} />
      </label>

      {/* Document list */}
      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
        {documents.map((doc) => {
          const st = statusLabel[doc.status]
          return (
            <div key={doc.id} className="flex items-center justify-between rounded border border-gray-100 bg-white px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-gray-700 truncate">{doc.name}</div>
                <div className="text-[9px] text-gray-400">{doc.uploadTime} · {doc.size}</div>
              </div>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${st.cls}`}>
                {st.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
