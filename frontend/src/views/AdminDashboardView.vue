<template>
  <div class="admin-layout">
    <section class="admin-shell glass-card">
      <div class="form-header">
        <div>
          <div class="eyebrow">后台管理中心</div>
          <h1 class="page-title" style="font-size: 36px">评分记录与开放日期管理</h1>
          <p class="lead">管理员可以维护站点开放区间，并按教师或日期筛选评分记录。</p>
        </div>
        <div class="inline-actions">
          <button class="btn btn-secondary" type="button" @click="loadAll" :disabled="loading">
            刷新数据
          </button>
          <button class="btn btn-ghost" type="button" @click="handleLogout">退出登录</button>
        </div>
      </div>

      <div v-if="message.text" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <section class="card" style="padding: 22px">
        <h2 class="panel-title" style="font-size: 24px">网站开放日期</h2>
        <div class="field-grid" style="margin-top: 18px">
          <div class="field">
            <label>开放开始日期</label>
            <input v-model="settings.openStartDate" type="date" />
          </div>
          <div class="field">
            <label>开放结束日期</label>
            <input v-model="settings.openEndDate" type="date" />
          </div>
        </div>
        <div class="panel-actions" style="margin-top: 18px">
          <button class="btn btn-primary" type="button" @click="saveSettings" :disabled="savingSettings">
            {{ savingSettings ? '保存中...' : '保存开放日期' }}
          </button>
        </div>
      </section>

      <section class="card" style="padding: 22px">
        <div class="form-header">
          <div>
            <h2 class="panel-title" style="font-size: 24px">评分记录</h2>
            <p class="panel-subtitle">点击任意一条记录可在右侧查看详情、快照和操作。</p>
          </div>
          <div class="inline-actions">
            <input v-model.trim="filters.teacher" type="text" placeholder="按教师筛选" />
            <input v-model="filters.lessonDate" type="date" />
            <button class="btn btn-secondary" type="button" @click="loadSubmissions" :disabled="loading">
              查询
            </button>
            <button class="btn btn-ghost" type="button" @click="exportExcel">
              导出 Excel
            </button>
          </div>
        </div>

        <div class="admin-table" style="margin-top: 18px">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>授课教师</th>
                <th>评分人</th>
                <th>课题</th>
                <th>得分</th>
                <th>授课日期</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in submissions"
                :key="item.id"
                :class="{ active: selectedSubmission?.id === item.id }"
                @click="selectSubmission(item.id)"
              >
                <td>{{ item.id }}</td>
                <td>{{ item.teacher }}</td>
                <td>{{ item.evaluator }} / {{ item.role }}</td>
                <td>{{ item.topic }}</td>
                <td>{{ item.total_score }}</td>
                <td>{{ item.lesson_date }}</td>
              </tr>
              <tr v-if="!submissions.length">
                <td colspan="6" class="empty-state">当前没有符合条件的评分记录。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <aside class="admin-shell glass-card">
      <template v-if="selectedSubmission">
        <div class="form-header">
          <div>
            <h2 class="panel-title" style="font-size: 28px">记录详情 #{{ selectedSubmission.id }}</h2>
            <p class="panel-subtitle">可在此预览快照、打印当前记录，或删除本条数据。</p>
          </div>
          <div class="inline-actions">
            <button class="btn btn-ghost" type="button" @click="openSnapshot">
              打开快照
            </button>
            <button class="btn btn-secondary" type="button" @click="printSnapshot">
              打印当前记录
            </button>
            <button class="btn btn-danger" type="button" @click="handleDelete" :disabled="deleting">
              {{ deleting ? '删除中...' : '删除记录' }}
            </button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <strong>{{ selectedSubmission.teacher }}</strong>
            <span>授课教师</span>
          </div>
          <div class="detail-item">
            <strong>{{ selectedSubmission.total_score }}</strong>
            <span>总分</span>
          </div>
          <div class="detail-item">
            <strong>{{ selectedSubmission.evaluator }} / {{ selectedSubmission.role }}</strong>
            <span>评分人</span>
          </div>
          <div class="detail-item">
            <strong>{{ selectedSubmission.lesson_date }}</strong>
            <span>授课日期</span>
          </div>
          <div class="detail-item">
            <strong>{{ selectedSubmission.languageDisplay }}</strong>
            <span>编程语言</span>
          </div>
          <div class="detail-item">
            <strong>{{ selectedSubmission.round || '未填写' }}</strong>
            <span>授课轮次</span>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1">
            <strong>{{ selectedSubmission.topic }}</strong>
            <span>授课课题</span>
          </div>
        </div>

        <div class="feedback-panels">
          <div class="feedback-card good">
            <strong>优点 / 核心亮点</strong>
            <p class="feedback-text">{{ selectedSubmission.highlights || '未填写' }}</p>
          </div>
          <div class="feedback-card tip">
            <strong>改进建议</strong>
            <p class="feedback-text">{{ selectedSubmission.suggestions || '未填写' }}</p>
          </div>
        </div>

        <div class="criteria-compact">
          <div
            v-for="(criterion, index) in selectedSubmission.criteria"
            :key="`${selectedSubmission.id}-${index}`"
            class="criteria-pill"
          >
            <span>{{ criterion.title }}</span>
            <strong>{{ criterion.score }}/{{ criterion.max }}</strong>
          </div>
        </div>

        <div class="snapshot-frame">
          <img :src="snapshotUrl" alt="评分快照" />
        </div>
      </template>

      <div v-else class="empty-state">
        先在左侧选择一条评分记录，这里会显示完整信息、评分细项和快照图片。
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  adminLogout,
  deleteSubmission,
  getAdminSession,
  getAdminSettings,
  getSnapshotUrl,
  getSubmission,
  getSubmissions,
  getSubmissionsExportUrl,
  updateAdminSettings,
} from '../lib/api'

const router = useRouter()
const loading = ref(false)
const savingSettings = ref(false)
const deleting = ref(false)
const submissions = ref([])
const selectedSubmission = ref(null)
const settings = reactive({
  openStartDate: '',
  openEndDate: '',
})
const filters = reactive({
  teacher: '',
  lessonDate: '',
})
const message = reactive({
  type: 'success',
  text: '',
})

const snapshotUrl = computed(() =>
  selectedSubmission.value ? `${getSnapshotUrl(selectedSubmission.value.id)}?v=${selectedSubmission.value.id}` : '',
)

function setMessage(type, text) {
  message.type = type
  message.text = text
}

function normalizeSubmission(data) {
  return {
    ...data,
    languageDisplay:
      data.language === '其他' && data.other_language
        ? `其他（${data.other_language}）`
        : data.language,
  }
}

async function ensureSession() {
  try {
    await getAdminSession()
  } catch (_error) {
    router.push('/admin/login')
    throw _error
  }
}

async function loadSettings() {
  const data = await getAdminSettings()
  settings.openStartDate = data.openStartDate || ''
  settings.openEndDate = data.openEndDate || ''
}

async function loadSubmissions() {
  loading.value = true
  try {
    submissions.value = await getSubmissions(filters)
    if (selectedSubmission.value) {
      const stillExists = submissions.value.find((item) => item.id === selectedSubmission.value.id)
      if (!stillExists) {
        selectedSubmission.value = null
      }
    }
  } finally {
    loading.value = false
  }
}

async function selectSubmission(id) {
  try {
    selectedSubmission.value = normalizeSubmission(await getSubmission(id))
  } catch (error) {
    setMessage('error', error.message)
  }
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await updateAdminSettings({
      openStartDate: settings.openStartDate || null,
      openEndDate: settings.openEndDate || null,
    })
    setMessage('success', '开放日期已保存。')
  } catch (error) {
    setMessage('error', error.message)
  } finally {
    savingSettings.value = false
  }
}

function exportExcel() {
  window.open(getSubmissionsExportUrl(filters), '_blank')
}

function openSnapshot() {
  if (snapshotUrl.value) {
    window.open(snapshotUrl.value, '_blank')
  }
}

function printSnapshot() {
  if (!snapshotUrl.value) {
    return
  }

  const win = window.open('', '_blank')
  if (!win) {
    setMessage('error', '浏览器拦截了弹窗，请允许弹窗后重试。')
    return
  }

  win.document.write(`
    <html lang="zh-CN">
      <head>
        <title>打印评分记录</title>
        <style>
          body { margin: 0; display: grid; place-items: center; background: #f8fafc; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <img src="${snapshotUrl.value}" alt="评分快照" onload="window.print(); setTimeout(() => window.close(), 200);" />
      </body>
    </html>
  `)
  win.document.close()
}

async function handleDelete() {
  if (!selectedSubmission.value) {
    return
  }

  const confirmed = window.confirm(
    `确定删除评分记录 #${selectedSubmission.value.id} 吗？\n删除后该记录和对应快照图片都会被移除。`,
  )
  if (!confirmed) {
    return
  }

  deleting.value = true
  try {
    await deleteSubmission(selectedSubmission.value.id)
    setMessage('success', '评分记录已删除。')
    selectedSubmission.value = null
    await loadSubmissions()
  } catch (error) {
    setMessage('error', error.message)
  } finally {
    deleting.value = false
  }
}

async function handleLogout() {
  await adminLogout()
  router.push('/admin/login')
}

async function loadAll() {
  setMessage('success', '')
  await loadSettings()
  await loadSubmissions()
}

onMounted(async () => {
  await ensureSession()
  await loadAll()
})
</script>
