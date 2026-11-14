<template>
  <div class="panel">
    <section class="records-head card">
      <div class="head-left">
        <div class="section-title">
          <span class="dot"></span>
          考勤记录
        </div>
        <p class="head-sub">
          共 <b class="mono">{{ filteredSessions.length }}</b> 次记录 · 平均出勤率
          <b class="mono">{{ averageRate }}%</b>
        </p>
      </div>
      <div class="head-right">
        <el-input v-model="keyword" class="search" placeholder="搜索日期 / 节次 / 班级" clearable>
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-checkbox v-model="allClasses">显示全部班级</el-checkbox>
      </div>
    </section>

    <section class="timeline card" v-if="filteredSessions.length">
      <article v-for="session in filteredSessions" :key="session.id" class="session">
        <div class="session-date">
          <strong class="mono">{{ session.date.slice(8) }}</strong>
          <span>{{ session.date.slice(5, 7) }}月 · {{ weekday(session.date) }}</span>
        </div>
        <div class="session-body">
          <div class="session-top">
            <div class="session-title">
              <h3>{{ session.period }}</h3>
              <el-tag size="small" effect="plain" type="info">{{ session.className }}</el-tag>
              <span class="session-time">保存于 {{ session.savedAt }}</span>
            </div>
            <div class="session-rate">
              <span class="mono">{{ summarize(session.records).rate }}%</span>
              <div class="rate-strip">
                <i
                  v-for="item in segments(session.records)"
                  :key="item.key"
                  :style="{ width: `${item.percent}%`, background: item.color }"
                ></i>
              </div>
            </div>
          </div>
          <div class="session-bottom">
            <div class="chips">
              <span
                v-for="item in STATUS_LIST"
                :key="item.key"
                class="chip"
                :style="{ '--tone': item.color, '--tone-soft': item.soft }"
              >
                {{ item.label }} <b class="mono">{{ summarize(session.records)[item.key] }}</b>
              </span>
            </div>
            <div class="session-actions">
              <el-button text type="primary" size="small" @click="openDetail(session)">
                <el-icon><View /></el-icon>
                明细
              </el-button>
              <el-button text size="small" @click="exportSession(session)">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <el-button text type="danger" size="small" @click="removeSession(session)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="card">
      <div class="empty-state">
        <div class="empty-icon"><el-icon><Notebook /></el-icon></div>
        <p>{{ store.classSessions.value.length ? '没有匹配的考勤记录' : '还没有保存过考勤记录' }}</p>
        <el-button
          v-if="!store.classSessions.value.length"
          type="primary"
          plain
          style="margin-top: 14px"
          @click="$emit('navigate', 'attendance')"
        >
          去考勤面板
        </el-button>
      </div>
    </section>

    <el-dialog v-model="detailVisible" title="考勤明细" width="660px" align-center>
      <template v-if="detail">
        <div class="detail-head">
          <div>
            <h3>{{ detail.date }} · {{ detail.period }}</h3>
            <p class="muted">{{ detail.className }} · 保存于 {{ detail.savedAt }}</p>
          </div>
          <div class="detail-rate">
            <strong class="mono">{{ summarize(detail.records).rate }}%</strong>
            <span>出勤率</span>
          </div>
        </div>
        <div class="detail-stats">
          <span v-for="item in STATUS_LIST" :key="item.key" :style="{ color: item.color }">
            {{ item.label }} {{ summarize(detail.records)[item.key] }} 人
          </span>
        </div>
        <el-table :data="detailRows" height="340" size="small">
          <el-table-column prop="sid" label="学号" width="130" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="group" label="分组" width="100" />
          <el-table-column label="考勤状态" min-width="110">
            <template #default="{ row }">
              <span class="status-text" :style="{ color: row.tone, background: row.soft }">
                {{ row.statusLabel }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportSession(detail)">
          <el-icon><Download /></el-icon>
          导出本次记录
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAttendance, STATUS_LIST, STATUS_MAP, summarize } from '../store/attendance'
import { exportExcel } from '../utils/tabular'

defineEmits(['navigate'])

const store = useAttendance()
const keyword = ref('')
const allClasses = ref(false)
const detailVisible = ref(false)
const detail = ref(null)

const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function weekday(date) {
  const value = new Date(`${date}T00:00:00`)
  return WEEKDAY[value.getDay()] || ''
}

const filteredSessions = computed(() => {
  const source = allClasses.value ? store.allSessions.value : store.classSessions.value
  const word = keyword.value.trim().toLowerCase()
  if (!word) return source
  return source.filter((session) =>
    `${session.date} ${session.period} ${session.className}`.toLowerCase().includes(word)
  )
})

const averageRate = computed(() => {
  const list = filteredSessions.value
  if (!list.length) return 0
  const total = list.reduce((sum, session) => sum + summarize(session.records).rate, 0)
  return Math.round((total / list.length) * 10) / 10
})

function segments(records) {
  const summary = summarize(records)
  const total = summary.total || 1
  return STATUS_LIST.map((item) => ({
    ...item,
    percent: Math.round((summary[item.key] / total) * 1000) / 10
  })).filter((item) => item.percent > 0)
}

const detailRows = computed(() => {
  if (!detail.value) return []
  const cls = store.state.classes.find((item) => item.id === detail.value.classId)
  const students = cls?.students || []
  const recordIds = Object.keys(detail.value.records || {})
  const known = students.filter((student) => recordIds.includes(student.id))
  const status = (id) => STATUS_MAP[detail.value.records[id] || 'present']
  return known
    .map((student) => ({
      ...student,
      statusLabel: status(student.id).label,
      tone: status(student.id).color,
      soft: status(student.id).soft
    }))
    .sort((a, b) => String(a.sid).localeCompare(String(b.sid)))
})

function openDetail(session) {
  detail.value = session
  detailVisible.value = true
}

function exportSession(session) {
  if (!session) return
  const rows = detailRowsOf(session).map((row) => [row.sid, row.name, row.group, row.statusLabel])
  exportExcel(
    `${session.className}-${session.date}-${session.period}-考勤记录.xlsx`,
    '考勤明细',
    ['学号', '姓名', '分组', '考勤状态'],
    rows
  )
  ElMessage.success('记录已导出')
}

function detailRowsOf(session) {
  const cls = store.state.classes.find((item) => item.id === session.classId)
  const students = cls?.students || []
  const recordIds = Object.keys(session.records || {})
  return students
    .filter((student) => recordIds.includes(student.id))
    .map((student) => ({
      ...student,
      statusLabel: STATUS_MAP[session.records[student.id] || 'present'].label
    }))
    .sort((a, b) => String(a.sid).localeCompare(String(b.sid)))
}

async function removeSession(session) {
  try {
    await ElMessageBox.confirm(
      `删除 ${session.date} ${session.period} 的考勤记录后不可恢复，是否继续？`,
      '删除考勤记录',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch (error) {
    return
  }
  store.removeSession(session.id)
  ElMessage.success('记录已删除')
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  flex-wrap: wrap;
}

.head-sub {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--muted);
}

.head-sub b {
  color: var(--ink);
}

.head-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.search {
  width: 230px;
}

.timeline {
  padding: 8px 18px;
}

.session {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px dashed var(--line);
}

.session:last-child {
  border-bottom: none;
}

.session-date {
  flex: none;
  width: 66px;
  padding-right: 14px;
  border-right: 1px solid var(--line);
  text-align: center;
}

.session-date strong {
  display: block;
  font-size: 26px;
  line-height: 1.1;
  color: var(--brand);
}

.session-date span {
  font-size: 11.5px;
  color: var(--muted);
}

.session-body {
  flex: 1;
  min-width: 0;
}

.session-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.session-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.session-title h3 {
  font-size: 15px;
}

.session-time {
  font-size: 11.5px;
  color: var(--muted);
}

.session-rate {
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-rate > span {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
}

.rate-strip {
  display: flex;
  width: 160px;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: #eef1f7;
}

.rate-strip i {
  display: block;
  height: 100%;
}

.session-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  color: var(--tone);
  background: var(--tone-soft);
}

.chip b {
  font-weight: 700;
}

.session-actions {
  display: flex;
  gap: 2px;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0 12px;
}

.detail-head h3 {
  font-size: 16px;
}

.detail-head p {
  font-size: 12px;
  margin-top: 3px;
}

.detail-rate {
  text-align: center;
}

.detail-rate strong {
  display: block;
  font-size: 24px;
  color: var(--brand);
}

.detail-rate span {
  font-size: 11.5px;
  color: var(--muted);
}

.detail-stats {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: #f8f9fd;
  font-size: 12.5px;
}

.status-text {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .search {
    width: 100%;
  }

  .rate-strip {
    width: 100px;
  }
}
</style>
