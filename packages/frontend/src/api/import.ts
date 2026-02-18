import { api } from './client'

export interface FileResult {
  filename: string
  foldersCreated: number
  snippetsImported: number
  snippetsSkipped: number
  warnings: string[]
  error?: string
}

export interface ImportResult {
  summary: {
    filesProcessed: number
    totalFoldersCreated: number
    totalSnippetsImported: number
  }
  files: FileResult[]
}

export const importApi = {
  textblaze: (workspaceId: string, files: File[]): Promise<ImportResult> => {
    const form = new FormData()
    form.append('workspaceId', workspaceId)
    files.forEach((f) => form.append('files', f))
    return api.post<ImportResult>('/import/textblaze', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
