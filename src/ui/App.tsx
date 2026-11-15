import { Route, Routes } from 'react-router'
import { ProgressProvider } from '../progress/ProgressContext'
import { Home } from './home/Home'
import { Landing } from './landing/Landing'
import { NotFound } from './NotFound'
import { LessonScreen } from './lesson/LessonScreen'
import { Playground } from './playground/Playground'
import { GuidesIndex } from './guides/GuidesIndex'
import { GuidePage } from './guides/GuidePage'
import { PhoneGate } from './phone/PhoneGate'
import { RouteChange } from './layout/RouteChange'

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/learn" element={<PhoneGate><Home /></PhoneGate>} />
      <Route path="/learn/:lessonId" element={<PhoneGate><LessonScreen /></PhoneGate>} />
      <Route path="/playground" element={<PhoneGate><Playground /></PhoneGate>} />
      <Route path="/guides" element={<GuidesIndex />} />
      <Route path="/guides/:guideId" element={<GuidePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App(): React.JSX.Element {
  return (
    <ProgressProvider>
      <RouteChange />
      <AppRoutes />
    </ProgressProvider>
  )
}
