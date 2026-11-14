<template>
  <div class="app-shell">
    <header class="topbar card">
      <div class="brand">
        <div class="brand-mark">
          <el-icon><Select /></el-icon>
        </div>
        <div class="brand-text">
          <h1>课堂考勤</h1>
          <p>Classroom Attendance · 实验四</p>
        </div>
      </div>

      <div class="topbar-right">
        <div class="class-switcher">
          <el-icon class="switch-icon"><School /></el-icon>
          <el-select
            :model-value="store.activeClass.value?.id"
            class="class-select"
            popper-class="class-select-popper"
            @change="handleClassChange"
          >
            <el-option
              v-for="item in store.state.classes"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            >
              <div class="class-option">
                <span>{{ item.name }}</span>
                <span class="class-option-count">{{ item.students.length }} 人</span>
              </div>
            </el-option>
          </el-select>
        </div>
        <div class="course-chip" v-if="store.activeClass.value?.course">
          {{ store.activeClass.value.course }}
        </div>
        <el-button text class="help-btn" @click="helpVisible = true">
          <el-icon><QuestionFilled /></el-icon>
          使用说明
        </el-button>
      </div>
    </header>

    <nav class="tabbar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: current === tab.key }"
        type="button"
        @click="current = tab.key"
      >
        <el-icon><component :is="tab.icon" /></el-icon>
        <span>{{ tab.label }}</span>
        <em v-if="tab.badge" class="tab-badge">{{ tab.badge }}</em>
      </button>
      <div class="tabbar-tail">
        <span class="save-state"><i></i>数据已保存至本地</span>
      </div>
    </nav>

    <main class="main">
      <transition name="fade-slide" mode="out-in">
        <component :is="currentView" @navigate="current = $event" />
      </transition>
    </main>

    <el-dialog v-model="helpVisible" title="使用说明" width="620px" align-center>
      <div class="help">
        <div class="help-step" v-for="(item, index) in helpSteps" :key="index">
          <span class="help-index">{{ index + 1 }}</span>
          <div>
            <h4>{{ item.title }}</h4>
            <p>{{ item.desc }}</p>
          </div>
        </div>
        <div class="help-shortcuts">
          <h4>快捷操作</h4>
          <div class="shortcut-row"><kbd>1</kbd><span>出勤</span><kbd>2</kbd><span>迟到</span><kbd>3</kbd><span>请假</span><kbd>4</kbd><span>早退</span><kbd>5</kbd><span>缺勤</span></div>
          <div class="shortcut-row"><kbd>Tab</kbd><span>切换下一位学生</span><kbd>Ctrl/⌘ + S</kbd><span>保存本次考勤</span></div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="helpVisible = false">开始使用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAttendance } from './store/attendance'
import AttendancePanel from './views/AttendancePanel.vue'
import StudentsPanel from './views/StudentsPanel.vue'
import RecordsPanel from './views/RecordsPanel.vue'
import StatsPanel from './views/StatsPanel.vue'

const store = useAttendance()
const current = ref('attendance')
const helpVisible = ref(false)

const tabs = computed(() => [
  { key: 'attendance', label: '考勤面板', icon: 'Checked', badge: 0 },
  { key: 'students', label: '学生名单', icon: 'User', badge: store.students.value.length },
  { key: 'records', label: '考勤记录', icon: 'Notebook', badge: store.classSessions.value.length },
  { key: 'stats', label: '数据统计', icon: 'DataAnalysis', badge: 0 }
])

const viewMap = {
  attendance: AttendancePanel,
  students: StudentsPanel,
  records: RecordsPanel,
  stats: StatsPanel
}

const currentView = computed(() => viewMap[current.value])

const helpSteps = [
  { title: '维护学生名单', desc: '可在「学生名单」中直接粘贴、导入 Excel / CSV 文件，系统会自动校验学号重复、姓名缺失等问题。' },
  { title: '开始课堂考勤', desc: '选择日期与节次，学生默认全部出勤，只需对迟到、请假、缺勤、早退的同学点一下即可切换状态。' },
  { title: '保存并复盘', desc: '保存后可在「考勤记录」中查看每一次课堂明细，「数据统计」会自动生成出勤率趋势与学生排行。' }
]

function handleClassChange(id) {
  store.setActiveClass(id)
  ElMessage.success(`已切换到 ${store.activeClass.value.name}`)
}

function onKeydown(event) {
  const meta = event.metaKey || event.ctrlKey
  if (meta && event.key.toLowerCase() === 's') {
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('attendance:save'))
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 20px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 12px;
  z-index: 20;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 22px;
  background: linear-gradient(135deg, #6366f1, #4f46e5 55%, #4338ca);
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.3);
}

.brand-text h1 {
  font-size: 19px;
  line-height: 1.2;
  letter-spacing: 0.4px;
}

.brand-text p {
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.3px;
  margin-top: 2px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.class-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px 3px 10px;
  border-radius: 11px;
  background: #f5f6fb;
  border: 1px solid var(--line);
}

.switch-icon {
  color: var(--brand);
}

.class-select {
  width: 202px;
}

.class-select :deep(.el-select__wrapper) {
  box-shadow: none !important;
  background: transparent;
  padding-left: 2px;
}

.class-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.class-option-count {
  color: var(--muted);
  font-size: 12px;
}

.course-chip {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-dark);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.help-btn {
  color: var(--ink-2);
}

.tabbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  margin-bottom: 18px;
  overflow-x: auto;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-2);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.tab:hover {
  background: #f1f2fa;
  color: var(--brand-dark);
}

.tab.active {
  background: linear-gradient(135deg, #5b53ea, #4f46e5);
  color: #fff;
  box-shadow: 0 8px 16px rgba(79, 70, 229, 0.28);
}

.tab-badge {
  font-style: normal;
  font-size: 11px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
}

.tab:not(.active) .tab-badge {
  background: #e8ecf6;
  color: var(--ink-2);
}

.tabbar-tail {
  margin-left: auto;
  padding-right: 10px;
}

.save-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.save-state i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.14);
}

.main {
  min-height: 480px;
}

.help-step {
  display: flex;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
}

.help-step:last-of-type {
  border-bottom: none;
}

.help-index {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--brand-soft);
  color: var(--brand-dark);
  font-weight: 700;
  font-size: 13px;
}

.help-step h4 {
  font-size: 14px;
  margin-bottom: 4px;
}

.help-step p {
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.7;
}

.help-shortcuts {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8f9fd;
}

.help-shortcuts h4 {
  font-size: 13px;
  margin-bottom: 10px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-2);
  margin-top: 8px;
  flex-wrap: wrap;
}

kbd {
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid #dfe3ee;
  border-bottom-width: 2px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  color: var(--ink);
}

@media (max-width: 900px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
    position: static;
  }

  .topbar-right {
    width: 100%;
    flex-wrap: wrap;
  }

  .class-select {
    width: 172px;
  }

  .tabbar-tail {
    display: none;
  }
}
</style>
