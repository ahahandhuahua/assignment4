<template>
  <div class="panel">
    <section class="control card">
      <div class="control-left">
        <div class="field">
          <label>考勤日期</label>
          <el-date-picker
            :model-value="draft.date"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :editable="false"
            class="date-picker"
            @update:model-value="store.setDraftDate"
          />
        </div>
        <div class="field">
          <label>上课节次</label>
          <el-select :model-value="draft.period" class="period-select" @change="store.setDraftPeriod">
            <el-option v-for="item in PERIOD_OPTIONS" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="session-state" :class="{ saved: sessionExists }">
          <el-icon><component :is="sessionExists ? 'CircleCheckFilled' : 'EditPen'" /></el-icon>
          <span>{{ sessionExists ? '该节次已有记录，修改后可再次保存' : '本次考勤尚未保存' }}</span>
        </div>
      </div>

      <div class="control-right">
        <el-button @click="pickerVisible = true">
          <el-icon><Aim /></el-icon>
          随机点名
        </el-button>
        <el-button @click="exportCurrent">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="primary" class="save-btn" @click="handleSave">
          <el-icon><Finished /></el-icon>
          保存考勤
        </el-button>
      </div>
    </section>

    <section class="overview card">
      <div class="tiles">
        <button
          v-for="tile in tiles"
          :key="tile.key"
          type="button"
          class="tile"
          :class="{ active: filter === tile.key }"
          :style="{ '--tone': tile.color, '--tone-soft': tile.soft }"
          @click="toggleFilter(tile.key)"
        >
          <span class="tile-icon"><el-icon><component :is="tile.icon" /></el-icon></span>
          <span class="tile-body">
            <strong class="mono">{{ tile.count }}</strong>
            <em>{{ tile.label }}</em>
          </span>
        </button>
      </div>

      <div class="rate-block">
        <div class="ring">
          <svg viewBox="0 0 42 42">
            <circle class="ring-track" cx="21" cy="21" r="17" />
            <circle
              class="ring-value"
              cx="21"
              cy="21"
              r="17"
              :stroke="rateColor"
              :stroke-dasharray="`${draftSummary.rate * 1.068} 999`"
            />
          </svg>
          <div class="ring-label">
            <strong class="mono">{{ draftSummary.rate }}<i>%</i></strong>
            <span>出勤率</span>
          </div>
        </div>
        <div class="rate-meta">
          <p>应到 <b class="mono">{{ draftSummary.total }}</b> 人</p>
          <p>实到 <b class="mono">{{ draftSummary.attended }}</b> 人</p>
          <p class="hint">迟到、早退计入实到</p>
        </div>
      </div>
    </section>

    <div class="ratio-bar" v-if="draftSummary.total">
      <span
        v-for="item in ratioSegments"
        :key="item.key"
        :style="{ width: `${item.percent}%`, background: item.color }"
        :title="`${item.label} ${item.count} 人`"
      ></span>
    </div>

    <section class="roster card">
      <div class="roster-head">
        <div class="section-title">
          <span class="dot"></span>
          学生考勤
          <span class="section-sub">{{ visibleStudents.length }} / {{ students.length }} 人</span>
        </div>
        <div class="tools">
          <el-input
            v-model="keyword"
            class="search"
            placeholder="搜索姓名 / 学号"
            clearable
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="sortBy" class="sort-select">
            <el-option label="按学号排序" value="sid" />
            <el-option label="按姓名排序" value="name" />
            <el-option label="按分组排序" value="group" />
          </el-select>
          <el-tooltip content="将全部学生标记为出勤" placement="top">
            <el-button @click="markAll('present')">
              <el-icon><Select /></el-icon>
              全部出勤
            </el-button>
          </el-tooltip>
          <el-tooltip content="撤销上一次操作" placement="top" :disabled="!store.meta.canUndo">
            <el-button text :disabled="!store.meta.canUndo" @click="handleUndo">
              <el-icon><RefreshLeft /></el-icon>
              撤销
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="filter-row">
        <button
          class="filter-chip"
          :class="{ active: filter === 'all' }"
          type="button"
          @click="filter = 'all'"
        >
          全部 <em class="mono">{{ students.length }}</em>
        </button>
        <button
          v-for="item in STATUS_LIST"
          :key="item.key"
          class="filter-chip"
          :class="{ active: filter === item.key }"
          :style="{ '--tone': item.color, '--tone-soft': item.soft }"
          type="button"
          @click="toggleFilter(item.key)"
        >
          {{ item.label }} <em class="mono">{{ draftSummary[item.key] }}</em>
        </button>
        <span class="tip">
          <el-icon><Pointer /></el-icon>
          点击卡片刻切换状态，数字键 1–5 可快捷标记
        </span>
      </div>

      <div v-if="students.length === 0" class="empty-state">
        <div class="empty-icon"><el-icon><User /></el-icon></div>
        <p>当前班级还没有学生</p>
        <el-button type="primary" plain style="margin-top: 14px" @click="$emit('navigate', 'students')">
          去导入学生名单
        </el-button>
      </div>

      <template v-else>
        <transition-group v-if="visibleStudents.length" name="card" tag="div" class="grid">
          <StudentCard
            v-for="(student, index) in visibleStudents"
            :key="student.id"
            :student="student"
            :status-key="draft.records[student.id] || 'present'"
            @cycle="onCardClick(student, index)"
            @set="(status) => setStatus(student, status)"
          />
        </transition-group>
        <div v-else class="empty-state">
          <div class="empty-icon"><el-icon><Search /></el-icon></div>
          <p>没有符合条件的学生</p>
          <el-button text type="primary" @click="clearFilters">清空筛选条件</el-button>
        </div>
      </template>

      <div class="roster-foot">
        <span class="foot-hint">
          共 {{ students.length }} 名学生 · 已标记 {{ draftSummary.total }} 人 ·
          <b v-if="!sessionExists">未保存</b>
          <b v-else class="saved-text">已保存</b>
        </span>
        <el-button type="primary" @click="handleSave">
          <el-icon><Finished /></el-icon>
          保存本次考勤
        </el-button>
      </div>
    </section>

    <RandomPicker
      v-model="pickerVisible"
      :students="students"
      :records="draft.records"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAttendance, PERIOD_OPTIONS, STATUS_LIST, STATUS_MAP } from '../store/attendance'
import StudentCard from '../components/StudentCard.vue'
import RandomPicker from '../components/RandomPicker.vue'
import { exportExcel } from '../utils/tabular'

defineEmits(['navigate'])

const store = useAttendance()
const { students, draft, draftSummary, sessionExists, activeClass } = store

const keyword = ref('')
const filter = ref('all')
const sortBy = ref('sid')
const pickerVisible = ref(false)
const focusId = ref(null)

const tiles = computed(() => [
  { key: 'present', label: '出勤', count: draftSummary.value.present, ...STATUS_MAP.present },
  { key: 'late', label: '迟到', count: draftSummary.value.late, ...STATUS_MAP.late },
  { key: 'leave', label: '请假', count: draftSummary.value.leave, ...STATUS_MAP.leave },
  { key: 'early', label: '早退', count: draftSummary.value.early, ...STATUS_MAP.early },
  { key: 'absent', label: '缺勤', count: draftSummary.value.absent, ...STATUS_MAP.absent }
])

const rateColor = computed(() => {
  const rate = draftSummary.value.rate
  if (rate >= 95) return '#16a34a'
  if (rate >= 85) return '#4f46e5'
  if (rate >= 70) return '#f59e0b'
  return '#ef4444'
})

const ratioSegments = computed(() => {
  const total = draftSummary.value.total || 1
  return STATUS_LIST.map((item) => ({
    ...item,
    count: draftSummary.value[item.key],
    percent: Math.round((draftSummary.value[item.key] / total) * 1000) / 10
  })).filter((item) => item.count > 0)
})

const visibleStudents = computed(() => {
  const word = keyword.value.trim().toLowerCase()
  let list = students.value.filter((student) => {
    if (filter.value !== 'all' && (draft.value.records[student.id] || 'present') !== filter.value) {
      return false
    }
    if (!word) return true
    return (
      student.name.toLowerCase().includes(word) || String(student.sid).toLowerCase().includes(word)
    )
  })
  list = list.slice().sort((a, b) => {
    if (sortBy.value === 'name') return a.name.localeCompare(b.name, 'zh-Hans-CN')
    if (sortBy.value === 'group') return String(a.group).localeCompare(String(b.group), 'zh-Hans-CN') || a.sid.localeCompare(b.sid)
    return String(a.sid).localeCompare(String(b.sid))
  })
  return list
})

function toggleFilter(key) {
  filter.value = filter.value === key ? 'all' : key
}

function clearFilters() {
  filter.value = 'all'
  keyword.value = ''
}

function onCardClick(student) {
  focusId.value = student.id
  store.cycleStatus(student.id)
}

function setStatus(student, status) {
  focusId.value = student.id
  store.setStatus(student.id, status)
}

function markAll(status) {
  const ids = visibleStudents.value.map((student) => student.id)
  if (!ids.length) return
  store.markMany(status, ids)
  ElMessage.success(`已将 ${ids.length} 名学生标记为${STATUS_MAP[status].label}`)
}

function handleUndo() {
  if (store.undo()) ElMessage.success('已撤销上一步操作')
  else ElMessage.warning('没有可撤销的操作')
}

async function handleSave() {
  if (!students.value.length) {
    ElMessage.warning('请先导入学生名单')
    return
  }
  if (sessionExists.value) {
    try {
      await ElMessageBox.confirm(
        `${draft.value.date} ${draft.value.period} 已存在考勤记录，保存后会覆盖原有记录。`,
        '覆盖已有记录',
        { type: 'warning', confirmButtonText: '覆盖保存', cancelButtonText: '再检查一下' }
      )
    } catch (error) {
      return
    }
  }
  const summary = { ...draftSummary.value }
  const result = store.saveDraft()
  if (!result) return
  ElMessage.success({
    message: `考勤已保存 · 应到 ${summary.total} 人，出勤率 ${summary.rate}%`,
    duration: 2400
  })
}

function exportCurrent() {
  if (!students.value.length) {
    ElMessage.warning('暂无学生数据可导出')
    return
  }
  const rows = students.value
    .slice()
    .sort((a, b) => String(a.sid).localeCompare(String(b.sid)))
    .map((student) => [
      student.sid,
      student.name,
      student.gender,
      student.group,
      STATUS_MAP[draft.value.records[student.id] || 'present'].label
    ])
  exportExcel(
    `${activeClass.value.name}-${draft.value.date}-${draft.value.period}-考勤表.xlsx`,
    '考勤明细',
    ['学号', '姓名', '性别', '分组', '考勤状态'],
    rows
  )
  ElMessage.success('考勤表已导出')
}

function onKeydown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target
  const tag = target?.tagName
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || target?.isContentEditable) return
  const index = Number(event.key)
  if (index >= 1 && index <= STATUS_LIST.length) {
    const status = STATUS_LIST[index - 1]
    const student = visibleStudents.value.find((item) => item.id === focusId.value)
    if (!student) return
    event.preventDefault()
    store.setStatus(student.id, status.key)
    ElMessage({ message: `${student.name} → ${status.label}`, duration: 900, grouping: true })
  }
}

function onGlobalSave() {
  handleSave()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('attendance:save', onGlobalSave)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('attendance:save', onGlobalSave)
})
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  flex-wrap: wrap;
}

.control-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 12px;
  color: var(--muted);
}

.date-picker {
  width: 158px;
}

.period-select {
  width: 132px;
}

.session-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: #b45309;
  background: #fef6e7;
}

.session-state.saved {
  color: #15803d;
  background: #e9f8ef;
}

.control-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-btn {
  padding-inline: 20px;
}

.overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  flex-wrap: wrap;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(5, minmax(96px, 1fr));
  gap: 10px;
  flex: 1;
  min-width: 420px;
}

.tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
}

.tile:hover {
  border-color: var(--tone);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(31, 41, 55, 0.07);
}

.tile.active {
  border-color: var(--tone);
  background: var(--tone-soft);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tone) 14%, transparent);
}

.tile-icon {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: var(--tone);
  background: var(--tone-soft);
  font-size: 16px;
}

.tile-body {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.tile-body strong {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
}

.tile-body em {
  font-style: normal;
  font-size: 12px;
  color: var(--muted);
}

.rate-block {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 20px;
  border-left: 1px dashed var(--line);
}

.ring {
  position: relative;
  width: 96px;
  height: 96px;
}

.ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: #eef1f7;
  stroke-width: 3.4;
}

.ring-value {
  fill: none;
  stroke-width: 3.4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), stroke 0.4s ease;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.ring-label strong {
  font-size: 21px;
  letter-spacing: -0.5px;
}

.ring-label strong i {
  font-style: normal;
  font-size: 12px;
  color: var(--muted);
  margin-left: 1px;
}

.ring-label span {
  font-size: 11px;
  color: var(--muted);
}

.rate-meta p {
  font-size: 12.5px;
  color: var(--ink-2);
  line-height: 1.9;
}

.rate-meta b {
  font-weight: 700;
  color: var(--ink);
}

.rate-meta .hint {
  color: var(--muted);
  font-size: 11.5px;
}

.ratio-bar {
  display: flex;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: #eef1f7;
  margin-top: -6px;
}

.ratio-bar span {
  transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.roster {
  padding: 16px 18px 14px;
}

.roster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search {
  width: 200px;
}

.sort-select {
  width: 132px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 12px 0 14px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--line);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink-2);
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.filter-chip em {
  font-style: normal;
  color: var(--muted);
}

.filter-chip:hover {
  border-color: var(--tone, var(--brand));
  color: var(--tone, var(--brand));
}

.filter-chip.active {
  border-color: var(--tone, var(--brand));
  color: var(--tone, var(--brand));
  background: var(--tone-soft, var(--brand-soft));
}

.filter-chip.active em {
  color: inherit;
}

.tip {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
  gap: 10px;
}

.card-enter-active {
  transition: all 0.25s ease;
}

.card-leave-active {
  transition: all 0.18s ease;
  position: absolute;
}

.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.roster-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}

.foot-hint {
  font-size: 12.5px;
  color: var(--muted);
}

.foot-hint b {
  color: #b45309;
  font-weight: 600;
}

.foot-hint .saved-text {
  color: #15803d;
}

@media (max-width: 960px) {
  .tiles {
    grid-template-columns: repeat(3, minmax(92px, 1fr));
    min-width: 0;
  }

  .rate-block {
    border-left: none;
    padding-left: 0;
  }
}

@media (max-width: 720px) {
  .tiles {
    grid-template-columns: repeat(2, minmax(92px, 1fr));
  }

  .search,
  .sort-select {
    width: 100%;
  }

  .tip {
    margin-left: 0;
  }
}
</style>
