<template>
  <div class="management-page">
    <section class="score-toolbar score-toolbar-card">
      <div class="score-toolbar-tip">
        超级管理员可以维护当前讲课信息、用户账号与权限，并查看评分记录快照。
      </div>
      <div class="panel-actions">
        <button class="btn btn-secondary" type="button" @click="loadAll" :disabled="loading">
          刷新数据
        </button>
      </div>
    </section>

    <div v-if="message.text" :class="['message', message.type]">
      {{ message.text }}
    </div>

    <div class="management-grid">
      <section class="manage-card">
        <h2>当前讲课信息</h2>
        <div class="score-grid">
          <div class="field field-full">
            <label class="toggle-field">
              <span>评分总开关</span>
              <small>关闭后，普通用户将看不到评分表页面，也不能提交评分。</small>
              <input v-model="lessonForm.scoringEnabled" type="checkbox" />
            </label>
          </div>
          <div class="field">
            <label>当前讲课老师</label>
            <input v-model.trim="lessonForm.currentTeacher" type="text" />
          </div>
          <div class="field">
            <label>当前讲课场次</label>
            <input v-model.trim="lessonForm.currentRound" type="text" placeholder="例如：第 1 场 / 第 2 轮次（30 分钟）" />
          </div>
          <div class="field">
            <label>当前讲课科目</label>
            <input v-model.trim="lessonForm.currentSubject" type="text" />
          </div>
          <div class="field field-full">
            <label>当前讲课内容</label>
            <input v-model.trim="lessonForm.currentTopic" type="text" />
          </div>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" type="button" @click="saveLesson" :disabled="savingLesson">
            {{ savingLesson ? '保存中...' : '保存当前讲课信息' }}
          </button>
        </div>
      </section>

      <section class="manage-card">
        <h2>创建用户</h2>
        <div class="score-grid">
          <div class="field">
            <label>账号</label>
            <input v-model.trim="createForm.username" type="text" placeholder="例如 teacher01" />
          </div>
          <div class="field">
            <label>姓名</label>
            <input v-model.trim="createForm.displayName" type="text" placeholder="例如 张老师" />
          </div>
          <div class="field">
            <label>初始密码</label>
            <input v-model.trim="createForm.password" type="password" placeholder="至少 6 位" />
          </div>
          <div class="field">
            <label>权限</label>
            <select v-model="createForm.role">
              <option value="USER">普通用户</option>
              <option value="SUPER_ADMIN">超级管理员</option>
            </select>
          </div>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" type="button" @click="handleCreateUser" :disabled="creatingUser">
            {{ creatingUser ? '创建中...' : '创建用户' }}
          </button>
        </div>
      </section>
    </div>

    <section class="manage-card">
      <div class="section-head">
        <h2>评分细则配置</h2>
        <span class="muted">管理员可以调整评分条目、说明内容和每条细则满分，评分页会实时使用这里的配置。</span>
      </div>

      <div class="criteria-config-list">
        <article
          v-for="(item, index) in criteriaForm"
          :key="index"
          class="criteria-config-item"
        >
          <div class="section-head">
            <strong>细则 {{ index + 1 }}</strong>
            <button
              class="btn btn-secondary btn-small"
              type="button"
              @click="removeCriterion(index)"
              :disabled="criteriaForm.length <= 1"
            >
              删除
            </button>
          </div>

          <div class="score-grid">
            <div class="field">
              <label>细则标题</label>
              <input v-model.trim="item.title" type="text" />
            </div>
            <div class="field">
              <label>该项满分</label>
              <input v-model.number="item.max" type="number" min="1" step="1" />
            </div>
            <div class="field field-full">
              <label>细则说明</label>
              <textarea v-model.trim="item.desc" />
            </div>
          </div>
        </article>
      </div>

      <div class="panel-actions">
        <button class="btn btn-secondary" type="button" @click="addCriterion">
          新增细则
        </button>
        <button class="btn btn-primary" type="button" @click="saveCriteria" :disabled="savingCriteria">
          {{ savingCriteria ? '保存中...' : '保存评分细则' }}
        </button>
      </div>
    </section>

    <div class="management-grid">
      <section class="manage-card">
        <div class="section-head">
          <h2>用户管理</h2>
          <span class="muted">选中用户后可修改姓名、密码和权限</span>
        </div>
        <div class="admin-table">
          <table>
            <thead>
              <tr>
                <th>账号</th>
                <th>姓名</th>
                <th>权限</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.id"
                :class="{ active: editingUser?.id === user.id }"
                @click="selectUser(user)"
              >
                <td>{{ user.username }}</td>
                <td>{{ user.displayName }}</td>
                <td>{{ user.role === 'SUPER_ADMIN' ? '超级管理员' : '普通用户' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="manage-card">
        <h2>修改用户</h2>
        <template v-if="editingUser">
          <div class="score-grid">
            <div class="field">
              <label>账号</label>
              <input :value="editingUser.username" type="text" readonly />
            </div>
            <div class="field">
              <label>姓名</label>
              <input v-model.trim="editForm.displayName" type="text" />
            </div>
            <div class="field">
              <label>重置密码</label>
              <input v-model.trim="editForm.password" type="password" placeholder="留空则不修改" />
            </div>
            <div class="field">
              <label>权限</label>
              <select v-model="editForm.role">
                <option value="USER">普通用户</option>
                <option value="SUPER_ADMIN">超级管理员</option>
              </select>
            </div>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary" type="button" @click="handleUpdateUser" :disabled="updatingUser">
              {{ updatingUser ? '保存中...' : '保存用户修改' }}
            </button>
          </div>
        </template>
        <div v-else class="empty-state">先在左侧选中一个用户，再在这里修改密码和权限。</div>
      </section>
    </div>

    <section class="manage-card">
      <div class="section-head">
        <h2>每周场次汇总</h2>
        <span class="muted">按周次、日期、场次、讲课老师、科目和内容拆分，避免不同讲课记录混在一起</span>
      </div>

      <div class="section-head-actions">
        <button class="btn btn-ghost btn-small" type="button" @click="exportSummaryExcel">
          导出周汇总 Excel
        </button>
      </div>

      <div v-if="summaryWeeks.length" class="summary-week-list">
        <article v-for="week in summaryWeeks" :key="week.weekStart" class="summary-week-card">
          <div class="summary-week-head">
            <div class="stack">
              <strong>{{ week.weekLabel }}</strong>
              <span class="muted">{{ week.sessionCount }} 场讲课 / {{ week.reviewCount }} 份评分</span>
            </div>
          </div>

          <div class="summary-session-list">
            <section v-for="session in week.sessions" :key="session.sessionKey" class="summary-session-card">
              <div class="summary-session-head">
                <div class="stack">
                  <strong>{{ session.teacher }}</strong>
                  <span class="muted">
                    {{ session.lessonDate }} / {{ session.round || '未填写场次' }} / {{ session.subject || '未填写科目' }}
                  </span>
                  <span class="muted">{{ session.topic || '未填写讲课内容' }}</span>
                </div>

                <div class="summary-metrics">
                  <div class="summary-metric">
                    <strong>{{ session.averageScore }}</strong>
                    <span>平均分</span>
                  </div>
                  <div class="summary-metric">
                    <strong>{{ session.maxScore }}</strong>
                    <span>最高分</span>
                  </div>
                  <div class="summary-metric">
                    <strong>{{ session.minScore }}</strong>
                    <span>最低分</span>
                  </div>
                  <div class="summary-metric">
                    <strong>{{ session.reviewCount }}</strong>
                    <span>评分人数</span>
                  </div>
                </div>
              </div>

              <div class="admin-table summary-table">
                <table>
                  <thead>
                    <tr>
                      <th>评分人</th>
                      <th>总分</th>
                      <th>优点亮点</th>
                      <th>改进建议</th>
                      <th>提交时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="review in session.reviews" :key="review.id">
                      <td>
                        <div class="stack">
                          <strong>{{ review.displayName }}</strong>
                          <span class="muted">{{ review.role }}</span>
                        </div>
                      </td>
                      <td>{{ review.totalScore }}</td>
                      <td>{{ review.highlights || '未填写' }}</td>
                      <td>{{ review.suggestions || '未填写' }}</td>
                      <td>{{ review.createdAt.replace('T', ' ').slice(0, 16) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">当前还没有可汇总的评分记录，提交评分后这里会按周和场次自动整理。</div>
    </section>

    <div class="management-grid management-grid-wide">
      <section class="manage-card">
        <div class="section-head">
          <h2>评分记录</h2>
          <div class="filter-bar">
            <input v-model.trim="filters.teacher" type="text" placeholder="按讲课老师筛选" />
            <input v-model="filters.lessonDate" type="date" />
            <button class="btn btn-secondary" type="button" @click="loadSubmissions" :disabled="loading">
              查询
            </button>
            <button class="btn btn-ghost" type="button" @click="exportExcel">
              导出 Excel
            </button>
          </div>
        </div>

        <div class="admin-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>讲课老师</th>
                <th>评分用户</th>
                <th>讲课内容</th>
                <th>总分</th>
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
                <td>{{ item.evaluator }}</td>
                <td>{{ item.topic }}</td>
                <td>{{ item.total_score }}</td>
              </tr>
              <tr v-if="!submissions.length">
                <td colspan="5" class="empty-state">当前没有评分记录。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="manage-card">
        <h2>记录详情</h2>
        <template v-if="selectedSubmission">
          <div class="detail-grid">
            <div class="detail-item">
              <strong>{{ selectedSubmission.lesson_teacher }}</strong>
              <span>讲课老师</span>
            </div>
            <div class="detail-item">
              <strong>{{ selectedSubmission.total_score }}</strong>
              <span>总分</span>
            </div>
            <div class="detail-item">
              <strong>{{ selectedSubmission.display_name }}</strong>
              <span>评分用户</span>
            </div>
            <div class="detail-item">
              <strong>{{ selectedSubmission.lesson_subject }}</strong>
              <span>讲课科目</span>
            </div>
            <div class="detail-item field-full">
              <strong>{{ selectedSubmission.lesson_topic }}</strong>
              <span>讲课内容</span>
            </div>
          </div>

          <div class="panel-actions">
            <button class="btn btn-ghost" type="button" @click="openSnapshot">
              打开快照
            </button>
            <button class="btn btn-secondary" type="button" @click="printSnapshot">
              打印当前记录
            </button>
            <button class="btn btn-danger" type="button" @click="handleDeleteSubmission" :disabled="deletingSubmission">
              {{ deletingSubmission ? '删除中...' : '删除记录' }}
            </button>
          </div>

          <div class="snapshot-frame">
            <img :src="snapshotUrl" alt="评分快照" />
          </div>
        </template>
        <div v-else class="empty-state">先在左侧选中评分记录，这里会显示快照和详细信息。</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createUser,
  deleteSubmission,
  getCriteriaConfig,
  getLessonSettings,
  getSnapshotUrl,
  getSubmission,
  getSubmissionSummaryExportUrl,
  getSubmissionSummaries,
  getSubmissions,
  getSubmissionsExportUrl,
  getUsers,
  updateCriteriaConfig,
  updateLessonSettings,
  updateUser,
} from '../lib/api'
import { loadSession } from '../lib/auth'

const loading = ref(false)
const savingLesson = ref(false)
const savingCriteria = ref(false)
const creatingUser = ref(false)
const updatingUser = ref(false)
const deletingSubmission = ref(false)

const users = ref([])
const submissions = ref([])
const summaryWeeks = ref([])
const editingUser = ref(null)
const selectedSubmission = ref(null)

const lessonForm = reactive({
  currentTeacher: '',
  currentTopic: '',
  currentSubject: '',
  currentRound: '',
  scoringEnabled: false,
})

const criteriaForm = ref([])

const createForm = reactive({
  username: '',
  displayName: '',
  password: '',
  role: 'USER',
})

const editForm = reactive({
  displayName: '',
  password: '',
  role: 'USER',
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

function resetCreateForm() {
  createForm.username = ''
  createForm.displayName = ''
  createForm.password = ''
  createForm.role = 'USER'
}

function createEmptyCriterion() {
  return {
    title: '',
    desc: '',
    max: 10,
  }
}

function selectUser(user) {
  editingUser.value = user
  editForm.displayName = user.displayName
  editForm.password = ''
  editForm.role = user.role
}

async function loadLesson() {
  const lesson = await getLessonSettings()
  lessonForm.currentTeacher = lesson.currentTeacher
  lessonForm.currentTopic = lesson.currentTopic
  lessonForm.currentSubject = lesson.currentSubject
  lessonForm.currentRound = lesson.currentRound
  lessonForm.scoringEnabled = Boolean(lesson.scoringEnabled)
}

async function loadCriteria() {
  criteriaForm.value = await getCriteriaConfig()
}

async function loadUsersList() {
  users.value = await getUsers()
  if (editingUser.value) {
    const latest = users.value.find((item) => item.id === editingUser.value.id)
    editingUser.value = latest || null
    if (latest) {
      editForm.displayName = latest.displayName
      editForm.role = latest.role
    }
  }
}

async function loadSubmissions() {
  loading.value = true
  try {
    const [submissionRows, summaryRows] = await Promise.all([
      getSubmissions(filters),
      getSubmissionSummaries(filters),
    ])
    submissions.value = submissionRows
    summaryWeeks.value = summaryRows
  } finally {
    loading.value = false
  }
}

async function selectSubmission(id) {
  selectedSubmission.value = await getSubmission(id)
}

async function saveLesson() {
  savingLesson.value = true
  try {
    await updateLessonSettings({ ...lessonForm })
    await loadSession(true)
    setMessage('success', '当前讲课信息已保存。')
  } catch (error) {
    setMessage('error', error.message)
  } finally {
    savingLesson.value = false
  }
}

function addCriterion() {
  criteriaForm.value = [...criteriaForm.value, createEmptyCriterion()]
}

function removeCriterion(index) {
  criteriaForm.value = criteriaForm.value.filter((_, itemIndex) => itemIndex !== index)
}

async function saveCriteria() {
  savingCriteria.value = true
  try {
    const payload = criteriaForm.value.map((item) => ({
      title: String(item.title || '').trim(),
      desc: String(item.desc || '').trim(),
      max: Number(item.max || 0),
    }))

    criteriaForm.value = await updateCriteriaConfig(payload)
    setMessage('success', '评分细则已更新。')
  } catch (error) {
    setMessage('error', error.message)
  } finally {
    savingCriteria.value = false
  }
}

async function handleCreateUser() {
  creatingUser.value = true
  try {
    await createUser({ ...createForm })
    resetCreateForm()
    await loadUsersList()
    setMessage('success', '用户创建成功。')
  } catch (error) {
    setMessage('error', error.message)
  } finally {
    creatingUser.value = false
  }
}

async function handleUpdateUser() {
  if (!editingUser.value) {
    return
  }

  updatingUser.value = true
  try {
    const payload = {
      displayName: editForm.displayName,
      role: editForm.role,
    }
    if (editForm.password) {
      payload.password = editForm.password
    }

    await updateUser(editingUser.value.id, payload)
    await loadUsersList()
    setMessage('success', '用户信息已更新。')
  } catch (error) {
    setMessage('error', error.message)
  } finally {
    updatingUser.value = false
  }
}

function exportExcel() {
  window.open(getSubmissionsExportUrl(filters), '_blank')
}

function exportSummaryExcel() {
  window.open(getSubmissionSummaryExportUrl(filters), '_blank')
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

async function handleDeleteSubmission() {
  if (!selectedSubmission.value) {
    return
  }

  const confirmed = window.confirm(
    `确定删除评分记录 #${selectedSubmission.value.id} 吗？\n删除后该记录和快照都会被移除。`,
  )
  if (!confirmed) {
    return
  }

  deletingSubmission.value = true
  try {
    await deleteSubmission(selectedSubmission.value.id)
    selectedSubmission.value = null
    await loadSubmissions()
    setMessage('success', '评分记录已删除。')
  } catch (error) {
    setMessage('error', error.message)
  } finally {
    deletingSubmission.value = false
  }
}

async function loadAll() {
  setMessage('success', '')
  await Promise.all([loadLesson(), loadCriteria(), loadUsersList(), loadSubmissions()])
}

onMounted(loadAll)
</script>
