import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspaces } from '../api/workspaces'
import { importApi, type ImportResult, type FileResult } from '../api/import'
import { useQueryClient } from '@tanstack/react-query'
import styles from './ImportPage.module.css'

type Step = 'select' | 'importing' | 'done'

export default function ImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces()

  const [step, setStep] = useState<Step>('select')
  const [workspaceId, setWorkspaceId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Set default workspace once loaded
  if (workspaces && workspaces.length > 0 && !workspaceId) {
    const personal = workspaces.find((w) => w.isPersonal)
    setWorkspaceId(personal ? personal.id : workspaces[0].id)
  }

  // ── File handling ────────────────────────────────────────────────
  function addFiles(incoming: FileList | File[]) {
    const jsonFiles = Array.from(incoming).filter((f) =>
      f.name.endsWith('.json') || f.type === 'application/json'
    )
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...jsonFiles.filter((f) => !existing.has(f.name))]
    })
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  // ── Import ───────────────────────────────────────────────────────
  async function handleImport() {
    if (!workspaceId || files.length === 0) return
    setStep('importing')
    setError('')
    try {
      const data = await importApi.textblaze(workspaceId, files)
      setResult(data)
      setStep('done')
      // Invalidate folder + snippet caches so sidebar refreshes
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['snippets'] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      setError(msg)
      setStep('select')
    }
  }

  const totalWarnings = result?.files.reduce((n, f) => n + f.warnings.length, 0) ?? 0
  const fileErrors = result?.files.filter((f) => f.error) ?? []

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div>
          <h1 className={styles.title}>Import from TextBlaze</h1>
          <p className={styles.subtitle}>Select one or more TextBlaze JSON export files to import into SnipLogic.</p>
        </div>
      </div>

      {/* ── Step: select ── */}
      {step === 'select' && (
        <div className={styles.card}>
          {/* Workspace selector */}
          <div className={styles.field}>
            <label className={styles.label}>Import into workspace</label>
            {loadingWorkspaces ? (
              <div className={styles.selectSkeleton} />
            ) : (
              <select
                className={styles.select}
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              >
                {workspaces?.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}{ws.isPersonal ? ' (Personal)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Drop zone */}
          <div className={styles.field}>
            <label className={styles.label}>Select TextBlaze JSON files</label>
            <div
              className={`${styles.dropZone} ${dragging ? styles.dropZoneDragging : ''}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.dropIcon}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className={styles.dropText}>
                <span className={styles.dropLink}>Click to browse</span> or drag &amp; drop files here
              </p>
              <p className={styles.dropHint}>JSON files only · Up to 25 files at once</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                className={styles.hiddenInput}
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
          </div>

          {/* Selected files list */}
          {files.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>{files.length} file{files.length !== 1 ? 's' : ''} selected</label>
              <ul className={styles.fileList}>
                {files.map((file) => (
                  <li key={file.name} className={styles.fileItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={styles.fileIcon}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</span>
                    <button
                      className={styles.removeBtn}
                      onClick={(e) => { e.stopPropagation(); removeFile(file.name) }}
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={() => navigate('/')}>Cancel</button>
            <button
              className={styles.importBtn}
              disabled={files.length === 0 || !workspaceId}
              onClick={handleImport}
            >
              Import {files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: importing ── */}
      {step === 'importing' && (
        <div className={styles.card}>
          <div className={styles.importing}>
            <div className={styles.spinner} />
            <p className={styles.importingText}>Importing {files.length} file{files.length !== 1 ? 's' : ''}…</p>
            <p className={styles.importingHint}>This may take a moment for large exports.</p>
          </div>
        </div>
      )}

      {/* ── Step: done ── */}
      {step === 'done' && result && (
        <div className={styles.card}>
          {/* Summary banner */}
          <div className={styles.successBanner}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Import complete</span>
          </div>

          <div className={styles.statRow}>
            <Stat label="Files processed" value={result.summary.filesProcessed} />
            <Stat label="Folders created" value={result.summary.totalFoldersCreated} />
            <Stat label="Snippets imported" value={result.summary.totalSnippetsImported} />
            {totalWarnings > 0 && <Stat label="Shortcuts skipped" value={totalWarnings} warn />}
          </div>

          {/* Per-file detail */}
          {result.files.map((f) => <FileResultRow key={f.filename} file={f} />)}

          {fileErrors.length > 0 && (
            <div className={styles.errorBox}>
              <strong>Files with errors:</strong>
              {fileErrors.map((f) => (
                <p key={f.filename} className={styles.errorDetail}>
                  {f.filename}: {f.error}
                </p>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.importBtn} onClick={() => navigate('/')}>
              View my snippets
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className={`${styles.statValue} ${warn ? styles.statWarn : ''}`}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function FileResultRow({ file }: { file: FileResult }) {
  return (
    <div className={styles.fileResultRow}>
      <div className={styles.fileResultHeader}>
        <span className={styles.fileResultName}>{file.filename}</span>
        {file.error ? (
          <span className={styles.fileResultBadgeError}>Error</span>
        ) : (
          <span className={styles.fileResultBadgeOk}>
            {file.foldersCreated} folder{file.foldersCreated !== 1 ? 's' : ''} · {file.snippetsImported} snippets
          </span>
        )}
      </div>
      {file.error && <p className={styles.fileResultError}>{file.error}</p>}
      {file.warnings.length > 0 && (
        <ul className={styles.warningList}>
          {file.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  )
}
