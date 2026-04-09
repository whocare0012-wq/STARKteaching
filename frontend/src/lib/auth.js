import { reactive } from 'vue'
import { getSession } from './api'

export const authState = reactive({
  ready: false,
  authenticated: false,
  user: null,
  lesson: null,
  today: '',
})

let inflight = null

export async function loadSession(force = false) {
  if (inflight && !force) {
    return inflight
  }

  inflight = getSession()
    .then((data) => {
      authState.ready = true
      authState.authenticated = true
      authState.user = data.user
      authState.lesson = data.lesson
      authState.today = data.today
      return authState
    })
    .catch(() => {
      authState.ready = true
      authState.authenticated = false
      authState.user = null
      authState.lesson = null
      authState.today = ''
      return authState
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function clearSession() {
  authState.ready = true
  authState.authenticated = false
  authState.user = null
  authState.lesson = null
  authState.today = ''
}
