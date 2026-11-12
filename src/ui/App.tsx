import { Route, Routes } from 'react-router'
import { ProgressProvider } from '../progress/ProgressContext'
import { Home } from './home/Home'
import { Landing } from './landing/Landing'
import { NotFound } from './NotFound'
import { LessonScreen } from './lesson/LessonScreen'
import { Playground } from './playground/Playground'
import { GuidesIndex } from './guides/GuidesIndex'
import { GuidePage } from './guides/GuidePage'

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/learn" element={<Home />} />
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
