export interface Progress {
  version: 1
  completed: Record<string, { at: string }>
  lastLesson?: string
}

export const STORAGE_KEY = 'termtrek.progress.v1'

const NOT_BACKUP =
  "That file isn't a TermTrek backup. Choose the .json file you downloaded from TermTrek."
const NEWER =
  'This backup is from a newer TermTrek. Refresh the page to update, then try again.'

export function emptyProgress(): Progress {
  return { version: 1, completed: {} }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isProgress(v: unknown): v is Progress {
  if (!isRecord(v) || v.version !== 1 || !isRecord(v.completed)) return false
  if (v.lastLesson !== undefined && typeof v.lastLesson !== 'string') return false
  return Object.values(v.completed).every((e) => isRecord(e) && typeof e.at === 'string')
}

function defaultStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function loadProgress(storage?: Storage): Progress {
  try {
    const s = storage ?? defaultStorage()
    const raw = s?.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress()
    const parsed: unknown = JSON.parse(raw)
    return isProgress(parsed) ? parsed : emptyProgress()
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p: Progress, storage?: Storage): void {
  try {
    const s = storage ?? defaultStorage()
    s?.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // Storage may be full or blocked; progress just won't persist.
  }
}

export function markComplete(p: Progress, lessonId: string, nowIso: string): Progress {
  const at = p.completed[lessonId]?.at ?? nowIso
  return { ...p, completed: { ...p.completed, [lessonId]: { at } } }
}

export function exportBackup(p: Progress, nowIso: string): string {
  return JSON.stringify(
    { app: 'termtrek', kind: 'progress-backup', version: 1, exportedAt: nowIso, progress: p },
    null,
    2,
  )
}

export function importBackup(
  text: string,
): { ok: true; progress: Progress } | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: NOT_BACKUP }
  }
  if (!isRecord(data) || data.app !== 'termtrek' || data.kind !== 'progress-backup') {
    return { ok: false, error: NOT_BACKUP }
  }
  if (typeof data.version !== 'number') return { ok: false, error: NOT_BACKUP }
  if (data.version > 1) return { ok: false, error: NEWER }
  if (!isProgress(data.progress)) return { ok: false, error: NOT_BACKUP }
  return { ok: true, progress: data.progress }
}
