const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || '请求失败')
  }

  return data
}

export function login(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logout() {
  return request('/api/auth/logout', {
    method: 'POST',
  })
}

export function getSession() {
  return request('/api/auth/session')
}

export function getScoreSheetContext() {
  return request('/api/score-sheet/context')
}

export function submitScore(payload) {
  return request('/api/score-sheet/submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getLessonSettings() {
  return request('/api/admin/lesson')
}

export function updateLessonSettings(payload) {
  return request('/api/admin/lesson', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function getUsers() {
  return request('/api/admin/users')
}

export function createUser(payload) {
  return request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(id, payload) {
  return request(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function getSubmissions(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value)
    }
  })

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request(`/api/admin/submissions${suffix}`)
}

export function getSubmissionSummaries(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value)
    }
  })

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request(`/api/admin/submissions/summary${suffix}`)
}

export function getSubmission(id) {
  return request(`/api/admin/submissions/${id}`)
}

export function deleteSubmission(id) {
  return request(`/api/admin/submissions/${id}`, {
    method: 'DELETE',
  })
}

export function getSnapshotUrl(id) {
  return `${API_BASE}/api/admin/submissions/${id}/snapshot`
}

export function getSubmissionsExportUrl(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value)
    }
  })

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return `${API_BASE}/api/admin/submissions/export${suffix}`
}

export function getSubmissionSummaryExportUrl(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value)
    }
  })

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return `${API_BASE}/api/admin/submissions/summary/export${suffix}`
}
