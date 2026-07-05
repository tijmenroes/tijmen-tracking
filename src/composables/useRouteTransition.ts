import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'

export const routeTransitionName = ref('slide-forward')

export function resolveRouteTransition(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) {
  const toDepth = (to.meta.navDepth as number | undefined) ?? 0
  const fromDepth = (from.meta.navDepth as number | undefined) ?? 0
  routeTransitionName.value = toDepth < fromDepth ? 'slide-back' : 'slide-forward'
}
