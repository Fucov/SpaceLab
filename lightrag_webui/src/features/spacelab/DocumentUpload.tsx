/**
 * 平板终端 - 文档管理组件
 *
 * 功能：
 * - 上传文档（支持 TXT/PDF/MD）
 * - 查看文档详情（摘要、大小、分块数、状态）
 * - 删除文档（前端状态 + 调用 API）
 * - 调用真实 LightRAG API：POST /documents/upload, DELETE /documents
 */

import { useState, useCallback } from 'react'
import { useSpaceLabStore } from './store'
import { uploadDocument, batchUploadDocuments, deleteDocuments, getDocuments, getDocumentsPaginated } from '@/api/lightrag'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle, XCircle, Loader, Trash2, ChevronDown, ChevronUp, Info, RefreshCw } from 'lucide-react'

interface ExpandedDoc {
  id: string
  filePath?: string
  contentSummary?: string
  contentLength?: number
  chunksCount?: number
  errorMsg?: string
  createdAt?: string
}

export default function DocumentUpload() {
  const documents = useSpaceLabStore((s) => s.documents)
  const addDocument = useSpaceLabStore((s) => s.addDocument)
  const removeDocument = useSpaceLabStore((s) => s.removeDocument)
  const updateDocumentStatus = useSpaceLabStore((s) => s.updateDocumentStatus)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 从真实 API 刷新文档列表
  const refreshFromApi = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await getDocumentsPaginated({ page: 1, page_size: 50, sort_field: 'created_at', sort_direction: 'desc' })
      // 合并 API 数据到 store（保留本地新增的文档）
      res.documents.forEach((doc) => {
        const existing = documents.find((d) => d.id === doc.id)
        if (!existing) {
          addDocument({
            id: doc.id,
            name: doc.file_path || doc.id,
            status: doc.status as DocumentItem['status'],
            uploadTime: new Date(doc.created_at).toLocaleString('zh-CN'),
            size: `${(doc.content_length / 1024).toFixed(1)}KB`,
            contentSummary: doc.content_summary,
            contentLength: doc.content_length,
            chunksCount: doc.chunks_count,
            errorMsg: doc.error_msg,
            createdAt: doc.created_at,
          })
        }
      })
      toast.success('文档列表已同步')
    } catch {
      toast.error('同步失败，请检查服务连接')
    } finally {
      setRefreshing(false)
    }
  }, [documents, addDocument])

  // 上传文档
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setUploading(true)

    const newDocs = fileArray.map((file) => ({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      status: 'processing' as const,
      uploadTime: new Date().toLocaleString('zh-CN'),
      size: file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)}KB`
        : `${(file.size / 1024 / 1024).toFixed(1)}MB`,
    }))

    newDocs.forEach((doc) => addDocument(doc))

    try {
      await batchUploadDocuments(fileArray, () => {})
      newDocs.forEach((doc) => updateDocumentStatus(doc.id, 'processed'))
      toast.success(`${fileArray.length} 个文档已上传并索引`)
    } catch {
      newDocs.forEach((doc) => updateDocumentStatus(doc.id, 'error'))
      toast.error('部分文档上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [addDocument, updateDocumentStatus])

  // 删除文档
  const handleDelete = useCallback(async (docId: string, docName: string) => {
    if (!confirm(`确定删除文档 "${docName}" 吗？`)) return

    setDeletingId(docId)
    try {
      // 调用真实 API（如果 docId 不是本地生成的，则调用删除）
      if (!docId.startsWith('doc-') || docId.includes('local')) {
        await deleteDocuments([docId], true, false)
      }
      removeDocument(docId)
      toast.success('文档已删除')
    } catch {
      // 即使 API 失败也删除前端状态
      removeDocument(docId)
      toast.success('文档已从列表移除')
    } finally {
      setDeletingId(null)
    }
  }, [removeDocument])

  // 展开/收起详情
  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  // 状态映射
  const statusConfig = (status: string) => {
    switch (status) {
      case 'pending':    return { label: '待处理', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' }
      case 'processing': return { label: '处理中', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400 animate-pulse' }
      case 'preprocessed': return { label: '预处理', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400 animate-pulse' }
      case 'processed':  return { label: '已索引', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' }
      case 'error':     return { label: '失败', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' }
      default:          return { label: status, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' }
    }
  }

  const processedCount = documents.filter((d) => d.status === 'processed').length
  const errorCount = documents.filter((d) => d.status === 'error').length

  return (
    <div className="flex flex-col gap-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 tracking-wide flex items-center gap-2">
          <FileText className="w-4 h-4" />
          知识文档
        </h3>
        <div className="flex items-center gap-2">
          {/* 统计 */}
          <span className="text-xs text-green-600 font-medium">{processedCount} 已索引</span>
          {errorCount > 0 && (
            <span className="text-xs text-red-500 font-medium">{errorCount} 失败</span>
          )}
          {/* 刷新按钮 */}
          <button
            onClick={refreshFromApi}
            disabled={refreshing}
            className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
            title="从服务器同步"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 上传区 */}
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-gray-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Upload className="w-5 h-5" />
        <span className="text-sm font-medium">{uploading ? '上传中...' : '点击上传文档'}</span>
        <span className="text-xs text-gray-400">TXT / PDF / MD</span>
        <input type="file" accept=".txt,.pdf,.md" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

      {/* 文档列表 */}
      {documents.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {documents.map((doc) => {
            const sc = statusConfig(doc.status)
            const isExpanded = expandedId === doc.id
            const isDeleting = deletingId === doc.id

            return (
              <div key={doc.id} className={`rounded-lg border bg-white transition-all ${sc.border}`}>
                {/* 主行：图标+名称+状态+操作 */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
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
                    <div className="text-sm text-gray-800 font-medium truncate">{doc.name}</div>
                    <div className="text-xs text-gray-400">{doc.uploadTime} · {doc.size}</div>
                  </div>

                  {/* 状态标签 */}
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.color} ${sc.bg} ${sc.border}`}>
                    {sc.label}
                  </span>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* 展开详情 */}
                    <button
                      onClick={() => toggleExpand(doc.id)}
                      className="cursor-pointer p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="查看详情"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {/* 删除 */}
                    <button
                      onClick={() => handleDelete(doc.id, doc.name)}
                      disabled={isDeleting}
                      className="cursor-pointer p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="删除文档"
                    >
                      {isDeleting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className={`border-t px-3 py-2.5 text-xs space-y-1.5 ${sc.bg}`}>
                    {doc.contentSummary && (
                      <div>
                        <span className="text-gray-500 font-medium">摘要：</span>
                        <span className="text-gray-600 ml-1">{doc.contentSummary}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                      {doc.contentLength && <span>大小：{(doc.contentLength / 1024).toFixed(1)} KB</span>}
                      {doc.chunksCount && <span>分块：{doc.chunksCount}</span>}
                      {doc.filePath && <span className="truncate max-w-[180px]">路径：{doc.filePath}</span>}
                      {doc.createdAt && <span>创建：{new Date(doc.createdAt).toLocaleString('zh-CN')}</span>}
                    </div>
                    {doc.errorMsg && (
                      <div className="text-red-500 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {doc.errorMsg}
                      </div>
                    )}
                    {!doc.contentSummary && !doc.filePath && (
                      <div className="text-gray-400 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        点击"同步"按钮获取文档详情
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 空状态 */}
      {documents.length === 0 && (
        <div className="text-center py-4">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <div className="text-sm text-gray-400">暂无文档</div>
          <div className="text-xs text-gray-300 mt-1">上传文档后 AI 将能基于文档内容回答问题</div>
        </div>
      )}
    </div>
  )
}
