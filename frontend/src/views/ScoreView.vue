<template>
  <div class="score-page">
    <div class="score-toolbar score-toolbar-card">
      <div class="score-toolbar-tip">
        当前课程信息由超级管理员统一设置，评分用户登录后直接填写评分内容并提交。
      </div>
      <div class="panel-actions">
        <button class="btn btn-secondary" type="button" @click="resetForm" :disabled="submitting">
          清空重置
        </button>
        <button class="btn btn-primary" type="button" @click="handleSubmit" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交评分并生成快照' }}
        </button>
      </div>
    </div>

    <div class="score-sheet">
      <div class="score-sheet-header">
        <h1>STARK 教师授课互评表</h1>
      </div>

      <div v-if="message.text" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <section class="score-section">
        <h2>基础信息</h2>
        <div class="score-grid">
          <div class="field">
            <label>授课教师</label>
            <input :value="lesson.currentTeacher" type="text" readonly />
          </div>

          <div class="field">
            <label>评分人及身份</label>
            <div class="compact-fields">
              <input :value="authState.user?.displayName || ''" type="text" readonly />
              <input :value="authState.user?.roleLabel || ''" type="text" readonly />
            </div>
          </div>

          <div class="field">
            <label>授课课题</label>
            <input :value="lesson.currentTopic" type="text" readonly />
          </div>

          <div class="field">
            <label>授课科目</label>
            <input :value="lesson.currentSubject" type="text" readonly />
          </div>

          <div class="field">
            <label>授课日期</label>
            <input v-model="form.lessonDate" type="date" />
          </div>

          <div class="field">
            <label>授课轮次 / 时间</label>
            <input :value="form.round" type="text" readonly />
          </div>
        </div>
      </section>

      <section class="score-section">
        <div class="score-section-head">
          <h2>评分量表</h2>
          <div class="score-total">当前总分：<strong>{{ totalScore }}</strong> / 100</div>
        </div>

        <div class="score-table-wrap">
          <table class="score-table">
            <thead>
              <tr>
                <th style="width: 20%">评价维度</th>
                <th style="width: 45%">评价指标及细则</th>
                <th style="width: 35%">评分操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in criteria" :key="index">
                <td class="dimension-title">{{ item.title }}</td>
                <td>{{ item.desc }}</td>
                <td>
                  <div class="score-inputs">
                    <input v-model.number="item.score" type="range" min="0" :max="item.max" />
                    <input
                      v-model.number="item.score"
                      class="score-box"
                      type="number"
                      min="0"
                      :max="item.max"
                    />
                    <span class="muted">/ {{ item.max }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="score-section">
        <h2>评课反馈</h2>
        <div class="feedback-panels">
          <div class="feedback-card good field">
            <label>优点 / 核心亮点</label>
            <textarea
              v-model.trim="form.highlights"
              placeholder="记录讲课过程中的亮点、优点和可借鉴做法"
            />
          </div>

          <div class="feedback-card tip field">
            <label>改进建议</label>
            <textarea
              v-model.trim="form.suggestions"
              placeholder="记录需要优化的地方、可执行建议或提醒事项"
            />
          </div>
        </div>
      </section>

      <section class="score-sheet-footer">
        <div class="score-badge">
          <span>综合得分</span>
          <strong>{{ totalScore }}</strong>
          <em>{{ scoreLevelText }}</em>
        </div>
        <div class="signature-blocks">
          <div class="signature-line">
            <span>评分人签字：</span>
            <div></div>
          </div>
          <div class="signature-line">
            <span>日期：</span>
            <div>{{ displayDate }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { defaultCriteria } from '../constants/criteria'
import { getScoreSheetContext, submitScore } from '../lib/api'
import { authState, loadSession } from '../lib/auth'

const lesson = reactive({
  currentTeacher: '',
  currentTopic: '',
  currentSubject: '',
  currentRound: '',
})

const submitting = ref(false)
const message = reactive({
  type: 'success',
  text: '',
})

const createEmptyForm = (date = '', round = '') => ({
  lessonDate: date,
  round,
  highlights: '',
  suggestions: '',
})

const form = reactive(createEmptyForm())
const criteria = ref(defaultCriteria.map((item) => ({ ...item })))

const totalScore = computed(() =>
  criteria.value.reduce((sum, item) => sum + Number(item.score || 0), 0),
)

const scoreLevelText = computed(() => {
  if (totalScore.value >= 90) return '优秀'
  if (totalScore.value >= 80) return '良好'
  if (totalScore.value >= 70) return '合格'
  if (totalScore.value > 0) return '需改进'
  return '未打分'
})

const displayDate = computed(() => {
  if (!form.lessonDate) {
    return ''
  }
  return form.lessonDate.replaceAll('-', ' / ')
})

function resetForm(clearMessage = true) {
  Object.assign(form, createEmptyForm(authState.today, authState.lesson?.currentRound || lesson.currentRound || ''))
  criteria.value = defaultCriteria.map((item) => ({ ...item }))
  if (clearMessage) {
    message.text = ''
  }
}

async function loadContext() {
  await loadSession(true)
  const data = await getScoreSheetContext()
  lesson.currentTeacher = data.lesson.currentTeacher
  lesson.currentTopic = data.lesson.currentTopic
  lesson.currentSubject = data.lesson.currentSubject
  lesson.currentRound = data.lesson.currentRound
  form.lessonDate = data.today
  form.round = data.lesson.currentRound || ''
}

async function handleSubmit() {
  message.text = ''
  submitting.value = true

  try {
    const result = await submitScore({
      ...form,
      criteria: criteria.value.map((item) => ({
        title: item.title,
        desc: item.desc,
        max: item.max,
        score: Number(item.score || 0),
      })),
    })

    message.type = 'success'
    message.text = `${result.message} 记录编号：${result.id}`
    resetForm(false)
  } catch (error) {
    message.type = 'error'
    message.text = error.message
  } finally {
    submitting.value = false
  }
}

onMounted(loadContext)
</script>
