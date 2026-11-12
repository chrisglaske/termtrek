import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEY, loadProgress, markComplete, saveProgress } from './store'
import type { Progress } from './store'

interface ProgressApi {
  progress: Progress
  complete(id: string): void
  setLast(id: string): void
  replace(p: Progress): void
}

const Ctx = createContext<ProgressApi | null>(null)

export function ProgressProvider({
  children,
  storage,
}: {
  children: ReactNode
  storage?: Storage
}): React.JSX.Element {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(storage))
  // Skip saving on first mount and for state that just came from storage.
  const skipSave = useRef(true)

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    saveProgress(progress, storage)
  }, [progress, storage])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      skipSave.current = true
      setProgress(loadProgress(storage))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storage])

  // Build on the latest stored progress so a stale tab cannot drop another tab's work.
  const fresh = (p: Progress): Progress => {
    const stored = loadProgress(storage)
    return {
      ...p,
      ...stored,
      completed: { ...p.completed, ...stored.completed },
      lastLesson: p.lastLesson ?? stored.lastLesson,
    }
  }

  const api: ProgressApi = {
    progress,
    complete: (id) => setProgress((p) => markComplete(fresh(p), id, new Date().toISOString())),
    setLast: (id) =>
      setProgress((p) => (p.lastLesson === id ? p : { ...fresh(p), lastLesson: id })),
    replace: (p) => setProgress(p),
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useProgress(): ProgressApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProgress must be used inside a ProgressProvider')
  return v
}
