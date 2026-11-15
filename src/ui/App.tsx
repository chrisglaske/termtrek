import { Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { ProgressProvider } from '../progress/ProgressContext'
import { Landing } from './landing/Landing'
import { NotFound } from './NotFound'
import { PhoneGate } from './phone/PhoneGate'
import { RouteChange } from './layout/RouteChange'
import { lazyRoute } from './lazyRoute'
import { RouteErrorBoundary } from './RouteErrorBoundary'

const Home = lazyRoute(() => import('./home/Home').then((m) => ({ default: m.Home })))
const LessonScreen = lazyRoute(() => import('./lesson/LessonScreen').then((m) => ({ default: m.LessonScreen })))
const Playground = lazyRoute(() => import('./playground/Playground').then((m) => ({ default: m.Playground })))
const GuidesIndex = lazyRoute(() => import('./guides/GuidesIndex').then((m) => ({ default: m.GuidesIndex })))
const GuidePage = lazyRoute(() => import('./guides/GuidePage').then((m) => ({ default: m.GuidePage })))

export function AppRoutes(): React.JSX.Element {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<main id="main" tabIndex={-1} />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/learn" element={<PhoneGate><Home /></PhoneGate>} />
          <Route path="/learn/:lessonId" element={<PhoneGate><LessonScreen /></PhoneGate>} />
          <Route path="/playground" element={<PhoneGate><Playground /></PhoneGate>} />
          <Route path="/guides" element={<GuidesIndex />} />
          <Route path="/guides/:guideId" element={<GuidePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
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
