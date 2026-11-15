import { lazy } from 'react'
import type { ComponentType } from 'react'

/** A route's page, fetched the first time the route opens. Tests replace this with a synchronous version (src/test/setup.ts). */
export function lazyRoute(load: () => Promise<{ default: ComponentType }>): ComponentType {
  return lazy(load)
}
