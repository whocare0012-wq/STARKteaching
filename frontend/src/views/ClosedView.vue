<template>
  <div class="login-page">
    <section class="login-card stack">
      <div class="eyebrow">评分未开放</div>
      <h1 class="page-title">当前暂未开放评分</h1>
      <p class="lead">
        管理员关闭了评分总开关，当前不能查看和填写评分表。开放后刷新页面即可恢复。
      </p>

      <div class="panel-actions">
        <RouterLink v-if="authState.user?.role === 'SUPER_ADMIN'" class="btn btn-primary" to="/manage">
          前往管理页面
        </RouterLink>
        <RouterLink v-else class="btn btn-secondary" to="/login">
          返回登录页
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { authState } from '../lib/auth'
</script>
