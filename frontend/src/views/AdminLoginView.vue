<template>
  <section class="auth-card glass-card">
    <div class="eyebrow">管理员登录</div>
    <h1 class="page-title" style="font-size: 36px">进入后台管理中心</h1>
    <p class="lead">后台可查看评分记录、预览快照图片、设置网站开放日期。</p>

    <div v-if="message" class="message error" style="margin-top: 18px">
      {{ message }}
    </div>

    <div class="stack" style="margin-top: 24px">
      <div class="field">
        <label>管理员账号</label>
        <input v-model.trim="username" type="text" placeholder="请输入管理员账号" />
      </div>
      <div class="field">
        <label>管理员密码</label>
        <input v-model.trim="password" type="password" placeholder="请输入管理员密码" />
      </div>
      <button class="btn btn-primary" type="button" @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录后台' }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminLogin } from '../lib/api'

const router = useRouter()
const username = ref('')
const password = ref('')
const message = ref('')
const loading = ref(false)

async function handleLogin() {
  message.value = ''
  loading.value = true

  try {
    await adminLogin({
      username: username.value,
      password: password.value,
    })
    router.push('/admin')
  } catch (error) {
    message.value = error.message
  } finally {
    loading.value = false
  }
}
</script>
