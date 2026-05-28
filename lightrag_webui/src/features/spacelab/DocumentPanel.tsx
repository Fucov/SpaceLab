/**
 * 平板终端 - 文档管理组件
 *
 * 导出两个组件：
 * - UploadButton：顶部工具栏紧凑按钮组（上传 + 文档管理入口）
 * - DocumentPanelModal：完整文档管理 Modal 浮层
 */

import { useState, useCallback } from 'react'
import { useSpaceLabStore } from './store'
import { batchUploadDocuments, deleteDocuments, getDocumentsPaginated } from '@/api/lightrag'
import { toast } from 'sonner'
import {
  Upload, FileText, CheckCircle, XCircle, Loader, Trash2,
  RefreshCw, X, ChevronDown, ChevronUp, Info, FolderOpen,
} from 'lucide-react'

/* ================================================================ */
/* 工具栏按钮组（放在顶部导航栏右侧） */
/* ================================================================ */

export function UploadButton({ showUpload = true }: { showUpload?: boolean }) {
  const documents = useSpaceLabStore((s) => s.documents)
  const addDocument = useSpaceLabStore((s) => s.addDocument)
  const updateDocumentStatus = useSpaceLabStore((s) => s.updateDocumentStatus)
  const [showPanel, setShowPanel] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    setUploading(true)
    const newDocs = fileArray.map((file) => ({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      status: 'processing' as const,
      uploadTime: new Date().toLocaleString('zh-CN'),
      size: file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    }))
    newDocs.forEach((doc) => addDocument(doc))
    try {
      await batchUploadDocuments(fileArray, () => {})
      newDocs.forEach((doc) => updateDocumentStatus(doc.id, 'processed'))
      toast.success(`${fileArray.length} 个文档已上传`)
    } catch {
      newDocs.forEach((doc) => updateDocumentStatus(doc.id, 'error'))
      toast.error('上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [addDocument, updateDocumentStatus])

  const processedCount = documents.filter((d) => d.status === 'processed').length
  const errorCount = documents.filter((d) => d.status === 'error').length

  return (
    <div className="flex items-center gap-2">
      {processedCount > 0 && (
        <span className="text-xs text-green-600 font-medium">{processedCount} 已索引</span>
      )}
      {errorCount > 0 && (
        <span className="text-xs text-red-500 font-medium">{errorCount} 失败</span>
      )}
      {showUpload && (
        <label className={`cursor-pointer flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-3.5 h-3.5" />
          {uploading ? '上传中...' : '上传'}
          <input
            type="file"
            accept=".txt,.pdf,.md"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
      <button
        type="button"
        onClick={() => setShowPanel(true)}
        className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        文档
        {documents.length > 0 && (
          <span className="bg-gray-200 text-gray-700 rounded-full px-1.5 text-[10px] font-bold">
            {documents.length}
          </span>
        )}
      </button>
      {showPanel && <DocumentPanelModal onClose={() => setShowPanel(false)} />}
    </div>
  )
}

/* ================================================================ */
/* Modal 浮层 */
/* ================================================================ */

function DocumentPanelModal({ onClose }: { onClose: () => void }) {
  const documents = useSpaceLabStore((s) => s.documents)
  const addDocument = useSpaceLabStore((s) => s.addDocument)
  const removeDocument = useSpaceLabStore((s) => s.removeDocument)
  const updateDocumentStatus = useSpaceLabStore((s) => s.updateDocumentStatus)

  const [uploading, setUploading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

  const refreshFromApi = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await getDocumentsPaginated({
        page: 1, page_size: 50,
        sort_field: 'created_at', sort_direction: 'desc',
      })
      res.documents.forEach((doc) => {
        const existing = documents.find((d) => d.id === doc.id)
        if (!existing) {
          addDocument({
            id: doc.id,
            name: doc.file_path || doc.id,
            status: doc.status as 'pending' | 'processing' | 'preprocessed' | 'processed' | 'error',
            uploadTime: new Date(doc.created_at).toLocaleString('zh-CN'),
            size: doc.content_length ? `${(doc.content_length / 1024).toFixed(1)} KB` : '--',
            contentSummary: doc.content_summary,
            contentLength: doc.content_length,
            chunksCount: doc.chunks_count,
            errorMsg: doc.error_msg,
            createdAt: doc.created_at,
          })
        }
      })
      toast.success('文档已同步')
    } catch {
      toast.error('同步失败')
    } finally {
      setRefreshing(false)
    }
  }, [documents, addDocument])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    setUploading(true)
    const newDocs = fileArray.map((file) => ({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      status: 'processing' as const,
      uploadTime: new Date().toLocaleString('zh-CN'),
      size: file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    }))
    newDocs.forEach((doc) => addDocument(doc))
    try {
      await batchUploadDocuments(fileArray, () => {})
      newDocs.forEach((doc) => updateDocumentStatus(doc.id, 'processed'))
      toast.success(`${fileArray.length} 个文档已上传`)
    } catch {
      newDocs.forEach((doc) => updateDocumentStatus(doc.id, 'error'))
      toast.error('部分失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [addDocument, updateDocumentStatus])

  const handleDelete = useCallback(async (docId: string, docName: string) => {
    if (!confirm(`确定删除 "${docName}" 吗？`)) return
    setDeletingIds((prev) => new Set([...prev, docId]))
    try {
      if (!docId.startsWith('local-')) {
        await deleteDocuments([docId], true, false)
      }
      removeDocument(docId)
      toast.success('已删除')
    } catch {
      removeDocument(docId)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(docId)
        return next
      })
    }
  }, [removeDocument])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const statusCfg = (status: string) => {
    switch (status) {
      case 'processing': case 'preprocessed':
        return { label: '处理中', color: 'text-amber-600', dot: 'bg-amber-500 animate-pulse' }
      case 'processed':
        return { label: '已索引', color: 'text-green-600', dot: 'bg-green-500' }
      case 'error':
        return { label: '失败', color: 'text-red-500', dot: 'bg-red-500' }
      default:
        return { label: '待处理', color: 'text-gray-500', dot: 'bg-gray-400' }
    }
  }

  const processedCount = documents.filter((d) => d.status === 'processed').length
  const errorCount = documents.filter((d) => d.status === 'error').length

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-4 bottom-4 z-50 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-gray-500" />
            <div>
              <h2 className="text-base font-semibold text-gray-800">知识文档管理</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {documents.length} 个文档 · {processedCount} 已索引 · {errorCount} 失败
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshFromApi}
              disabled={refreshing}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              同步
            </button>
            <label className={`cursor-pointer flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload className="w-3.5 h-3.5" />
              {uploading ? '上传中...' : '上传'}
              <input
                type="file"
                accept=".txt,.pdf,.md"
                multiple
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 文档列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {documents.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileText className="w-12 h-12 mb-3" />
              <div className="text-sm font-medium">暂无文档</div>
              <div className="text-xs mt-1">上传文档后 AI 将能基于文档内容回答问题</div>
            </div>
          )}
          {documents.map((doc) => {
            const cfg = statusCfg(doc.status)
            const isExpanded = expandedIds.has(doc.id)
            const isDeleting = deletingIds.has(doc.id)
            return (
              <div key={doc.id} className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
                {/* 主行 */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* 状态图标 */}
                  {doc.status === 'processing' || doc.status === 'preprocessed' ? (
                    <Loader className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
                  ) : doc.status === 'processed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : doc.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  {/* 名称+时间 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{doc.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{doc.uploadTime} · {doc.size}</div>
                  </div>
                  {/* 状态标签 */}
                  <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(doc.id)}
                      className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.name)}
                      disabled={isDeleting}
                      className="cursor-pointer p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {isDeleting
                        ? <Loader className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className="px-4 py-3 border-t border-gray-100 bg-white space-y-2">
                    {doc.contentSummary && (
                      <div className="text-xs text-gray-600 leading-relaxed">
                        <span className="font-medium text-gray-700">摘要：</span>
                        {doc.contentSummary}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {doc.contentLength && <span>大小：{(doc.contentLength / 1024).toFixed(1)} KB</span>}
                      {doc.chunksCount && <span>分块：{doc.chunksCount} 个</span>}
                      {doc.createdAt && <span>创建：{new Date(doc.createdAt).toLocaleString('zh-CN')}</span>}
                    </div>
                    {doc.errorMsg && (
                      <div className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {doc.errorMsg}
                      </div>
                    )}
                    {!doc.contentSummary && (
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        点击&quot;同步&quot;获取文档详情
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
