/**
 * Chat Asset Uploads Component
 * Displays upload progress for chat attachments
 */

import { useEffect } from 'react'

import { useDirectChatAssetUpload, type UploadingFile } from '../hooks/useDirectChatAssetUpload'

interface ChatAssetUploadsProps {
  isVisible: boolean
  onClose: () => void
}

export function ChatAssetUploads({ isVisible, onClose }: ChatAssetUploadsProps) {
  const { uploadingFiles, cancelFile, retryFile, removeFile, clearCompleted, completedAssetIds } =
    useDirectChatAssetUpload()

  const activeFiles = uploadingFiles.filter(
    (f) => f.status !== 'complete' && f.status !== 'cancelled' && f.status !== 'failed',
  )

  useEffect(() => {
    if (completedAssetIds.length > 0 && activeFiles.length === 0) {
      clearCompleted()
    }
  }, [completedAssetIds.length, activeFiles.length, clearCompleted])

  if (!isVisible || uploadingFiles.length === 0) {
    return null
  }

  return (
    <div className="chat-asset-uploads">
      <div className="chat-asset-uploads-header">
        <h3>Uploads</h3>
        <button onClick={onClose} className="close-button" type="button">
          ×
        </button>
      </div>

      <div className="chat-asset-uploads-list">
        {uploadingFiles.map((file) => (
          <UploadItem
            key={file.localId}
            file={file}
            onCancel={() => cancelFile(file.localId)}
            onRetry={() => retryFile(file.localId)}
            onRemove={() => removeFile(file.localId)}
          />
        ))}
      </div>

      {activeFiles.length === 0 && uploadingFiles.length > 0 && (
        <button
          onClick={() => {
            clearCompleted()
            onClose()
          }}
          className="clear-all-button"
          type="button"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

interface UploadItemProps {
  file: UploadingFile
  onCancel: () => void
  onRetry: () => void
  onRemove: () => void
}

function UploadItem({ file, onCancel, onRetry, onRemove }: UploadItemProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusText = (): string => {
    switch (file.status) {
      case 'queued':
        return 'Pending'
      case 'uploading':
        return `Uploading... ${file.progress}%`
      case 'uploaded':
        return 'Uploaded'
      case 'finalizing':
        return 'Processing...'
      case 'complete':
        return 'Complete'
      case 'failed':
        return file.error || 'Failed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return ''
    }
  }

  const getStatusClass = (): string => {
    switch (file.status) {
      case 'complete':
        return 'status-complete'
      case 'failed':
        return 'status-failed'
      case 'cancelled':
        return 'status-cancelled'
      default:
        return 'status-progress'
    }
  }

  const isInProgress = file.status === 'uploading' || file.status === 'finalizing'

  return (
    <div className={`upload-item ${getStatusClass()}`}>
      <div className="upload-item-info">
        <div className="upload-item-name" title={file.file.name}>
          {file.file.name}
        </div>
        <div className="upload-item-meta">
          <span className="upload-item-size">{formatFileSize(file.file.size)}</span>
          <span className="upload-item-status">{getStatusText()}</span>
        </div>
      </div>

      {isInProgress && (
        <div className="upload-item-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${file.progress}%` }} />
          </div>
        </div>
      )}

      <div className="upload-item-actions">
        {isInProgress && (
          <button onClick={onCancel} className="action-button cancel" type="button">
            Cancel
          </button>
        )}
        {file.status === 'failed' && (
          <button onClick={onRetry} className="action-button retry" type="button">
            Retry
          </button>
        )}
        {(file.status === 'complete' ||
          file.status === 'cancelled' ||
          file.status === 'failed') && (
          <button onClick={onRemove} className="action-button remove" type="button">
            ×
          </button>
        )}
      </div>
    </div>
  )
}
