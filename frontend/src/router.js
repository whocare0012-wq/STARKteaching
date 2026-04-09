import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/LoginView.vue'
import ScoreView from './views/ScoreView.vue'
import ManagementView from './views/ManagementView.vue'
import ClosedView from './views/ClosedView.vue'
import { authState, loadSession } from './lib/auth'

function getDefaultAuthenticatedPath() {
  if (authState.user?.role === 'SUPER_ADMIN') {
    return authState.lesson?.scoringEnabled ? '/score' : '/manage'
  }

  return authState.lesson?.scoringEnabled ? '/score' : '/closed'
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => (authState.authenticated ? getDefaultAuthenticatedPath() : '/login'),
    },
    {
      path: '/login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/score',
      component: ScoreView,
      meta: { requiresAuth: true },
    },
    {
      path: '/closed',
      component: ClosedView,
      meta: { requiresAuth: true },
    },
    {
      path: '/manage',
      component: ManagementView,
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    },
    {
      path: '/admin',
      redirect: '/manage',
    },
  ],
})

router.beforeEach(async (to) => {
  await loadSession()

  if (to.meta.requiresAuth && !authState.authenticated) {
    return '/login'
  }

  if (to.meta.guestOnly && authState.authenticated) {
    return getDefaultAuthenticatedPath()
  }

  if (to.meta.requiresSuperAdmin && authState.user?.role !== 'SUPER_ADMIN') {
    return authState.lesson?.scoringEnabled ? '/score' : '/closed'
  }

  if (to.path === '/score' && !authState.lesson?.scoringEnabled) {
    return authState.user?.role === 'SUPER_ADMIN' ? '/manage' : '/closed'
  }

  if (to.path === '/closed' && authState.lesson?.scoringEnabled) {
    return authState.user?.role === 'SUPER_ADMIN' ? '/manage' : '/score'
  }

  return true
})

export default router
