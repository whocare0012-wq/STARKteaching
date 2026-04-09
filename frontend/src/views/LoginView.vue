<template>
  <div class="login-page">
    <section class="login-card">
      <div class="eyebrow">登录后进入系统</div>
      <h1 class="page-title">STARK 教师听课评分系统</h1>
      <p class="lead">
        普通用户登录后进入评分表，超级管理员登录后还可以进入管理页面维护用户和当前课程信息。
      </p>

      <div v-if="message" class="message error">
        {{ message }}
      </div>

      <div class="stack">
        <div class="field">
          <label>账号</label>
          <input v-model.trim="username" type="text" placeholder="请输入账号" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model.trim="password" type="password" placeholder="请输入密码" />
        </div>
        <button class="btn btn-primary" type="button" @click="handleLogin" :disabled="loading">
          {{ loading ? '登录中...' : '登录系统' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../lib/api'
import { loadSession } from '../lib/auth'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')

async function handleLogin() {
  message.value = ''
  loading.value = true

  try {
    await login({
      username: username.value,
      password: password.value,
    })
    const session = await loadSession(true)

    if (session.user?.role === 'SUPER_ADMIN') {
      router.push(session.lesson?.scoringEnabled ? '/score' : '/manage')
    } else {
      router.push(session.lesson?.scoringEnabled ? '/score' : '/closed')
    }
  } catch (error) {
    message.value = error.message
  } finally {
    loading.value = false
  }
}
</script>
