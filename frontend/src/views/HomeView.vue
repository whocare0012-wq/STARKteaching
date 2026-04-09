<template>
  <div class="stack">
    <section class="hero">
      <div class="glass-card hero-main">
        <div class="eyebrow">公开访问，无需登录</div>
        <h1>把教师听课评分，从单张网页升级成可归档、可管理的网站。</h1>
        <p class="lead">
          教师或教研人员可直接填写评分表并提交，系统会自动保存数据并生成标准化快照图片，管理员再统一查看与管理。
        </p>

        <div class="hero-actions">
          <RouterLink class="btn btn-primary" to="/score">进入评分表</RouterLink>
          <RouterLink class="btn btn-ghost" to="/admin/login">进入管理员后台</RouterLink>
        </div>

        <div class="metrics">
          <div class="metric">
            <strong>{{ openStatusLabel }}</strong>
            <span>网站开放状态</span>
          </div>
          <div class="metric">
            <strong>{{ settings.today || '--' }}</strong>
            <span>服务器当天日期</span>
          </div>
          <div class="metric">
            <strong>{{ openRangeLabel }}</strong>
            <span>管理员配置的开放区间</span>
          </div>
        </div>
      </div>

      <aside class="glass-card hero-side">
        <div :class="['status-badge', settings.isOpenToday ? 'status-open' : 'status-closed']">
          {{ settings.isOpenToday ? '当前可提交评分' : '当前暂停提交评分' }}
        </div>

        <div class="stack" style="margin-top: 20px">
          <div class="notice">
            <strong>自动日期</strong>
            评分页会自动带出当天日期，减少手工填写。
          </div>
          <div class="notice">
            <strong>统一快照</strong>
            每次提交后由服务器生成标准 PNG 快照，便于后台归档。
          </div>
          <div class="notice">
            <strong>后台可控</strong>
            管理员可以设置开放日期、筛选记录、预览和删除快照。
          </div>
        </div>
      </aside>
    </section>

    <section class="panel card">
      <h2 class="panel-title">当前站点说明</h2>
      <p class="panel-subtitle">
        这是你评分网站的首页示例。所有普通用户都可以直接访问首页和评分表页，不需要注册或登录。
      </p>
      <div class="summary-grid" style="margin-top: 22px">
        <div class="summary-item">
          <strong>前台用户</strong>
          <span>可填写评分表并提交</span>
        </div>
        <div class="summary-item">
          <strong>管理员</strong>
          <span>登录后台后管理数据与开放日期</span>
        </div>
        <div class="summary-item">
          <strong>部署方式</strong>
          <span>支持 Docker 单容器部署</span>
        </div>
      </div>
    </section>

    <section class="feature-strip">
      <div class="feature-card">
        <span>步骤 1</span>
        <strong>进入评分表</strong>
        <p>老师或教研人员直接访问评分页，系统自动带入当天日期。</p>
      </div>
      <div class="feature-card">
        <span>步骤 2</span>
        <strong>填写并提交</strong>
        <p>评分项、亮点和建议一起提交，不需要登录，也不会丢数据。</p>
      </div>
      <div class="feature-card">
        <span>步骤 3</span>
        <strong>后台统一归档</strong>
        <p>管理员查看快照、导出 Excel、打印当前记录并控制开放区间。</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getPublicSettings } from '../lib/api'

const settings = ref({
  openStartDate: null,
  openEndDate: null,
  today: '',
  isOpenToday: false,
})

const openStatusLabel = computed(() => (settings.value.isOpenToday ? '开放中' : '已关闭'))
const openRangeLabel = computed(() => {
  const { openStartDate, openEndDate } = settings.value
  if (openStartDate && openEndDate) {
    return `${openStartDate} 至 ${openEndDate}`
  }
  if (openStartDate) {
    return `${openStartDate} 起`
  }
  if (openEndDate) {
    return `截至 ${openEndDate}`
  }
  return '未限制'
})

onMounted(async () => {
  settings.value = await getPublicSettings()
})
</script>
