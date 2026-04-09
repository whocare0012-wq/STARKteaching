<template>
  <div class="app-shell">
    <header v-if="showHeader" class="topbar">
      <div class="container topbar-inner">
        <div class="brand">
          <span class="brand-mark">STARK</span>
          <span class="brand-copy">
            <strong>教师听课评分系统</strong>
            <small>{{ authState.user?.displayName }} / {{ authState.user?.roleLabel }}</small>
          </span>
        </div>

        <nav class="topnav">
          <RouterLink v-if="authState.lesson?.scoringEnabled" to="/score">评分表</RouterLink>
          <RouterLink v-if="authState.user?.role === 'SUPER_ADMIN'" to="/manage">管理页面</RouterLink>
          <button class="btn btn-ghost btn-small" type="button" @click="handleLogout">退出登录</button>
        </nav>
      </div>
    </header>

    <main class="container page-body">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { logout } from './lib/api'
import { authState, clearSession } from './lib/auth'

const route = useRoute()
const router = useRouter()

const showHeader = computed(() => route.path !== '/login' && authState.authenticated)

async function handleLogout() {
  await logout()
  clearSession()
  router.push('/login')
}
</script>
