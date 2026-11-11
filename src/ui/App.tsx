import { Navigate, Route, Routes } from 'react-router'
import { ProgressProvider, useProgress } from '../progress/ProgressContext'
import { allLessons, findLesson } from '../lessons/course'
import { Landing } from './landing/Landing'
import { NotFound } from './NotFound'
import { LessonScreen } from './lesson/LessonScreen'
import { Playground } from './playground/Playground'
import { GuidesIndex } from './guides/GuidesIndex'
import { GuidePage } from './guides/GuidePage'

function LearnRedirect(): React.JSX.Element {
  const { progress } = useProgress()
  const last = progress.lastLesson
  const all = allLessons()
  const target = last && findLesson(last) ? last : (all.find((l) => !progress.completed[l.id]) ?? all[0])?.id
  if (!target) return <NotFound />
  return <Navigate to={`/learn/${target}`} replace />
}

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/learn" element={<LearnRedirect />} />
      <Route path="/learn/:lessonId" element={<LessonScreen />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/guides" element={<GuidesIndex />} />
      <Route path="/guides/:guideId" element={<GuidePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App(): React.JSX.Element {
  return (
    <ProgressProvider>
      <AppRoutes />
    </ProgressProvider>
  )
}
