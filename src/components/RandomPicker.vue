<template>
  <el-dialog
    :model-value="modelValue"
    width="440px"
    align-center
    title="随机点名"
    class="picker-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="start"
    @closed="stop"
  >
    <div class="picker-body">
      <div class="picker-stage" :class="{ rolling, landed }" :style="{ '--stage': stageColor }">
        <template v-if="result">
          <span class="picker-avatar">{{ result.name.slice(-2) }}</span>
          <h3>{{ result.name }}</h3>
          <p class="mono">{{ result.sid }}</p>
          <span v-if="statusText" class="picker-status">{{ statusText }}</span>
        </template>
        <template v-else-if="rolling">
          <span class="picker-avatar rolling-avatar">{{ previewName.slice(-2) }}</span>
          <h3>{{ previewName }}</h3>
          <p class="muted">正在抽取…</p>
        </template>
        <template v-else>
          <span class="picker-empty">点击下方按钮开始</span>
        </template>
      </div>

      <div class="picker-hint" v-if="excludeAbsent">
        仅从未到（请假 / 缺勤 / 早退）的学生中抽取
      </div>
      <el-checkbox v-model="excludeAbsent" class="picker-switch" :disabled="rolling">
        只点名未到的学生
      </el-checkbox>
    </div>

    <template #footer>
      <div class="picker-footer">
        <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
        <el-button type="primary" :disabled="!pool.length" @click="start">
          <el-icon><RefreshRight /></el-icon>
          {{ result ? '再抽一次' : '开始抽取' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { STATUS_MAP } from '../store/attendance'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  students: { type: Array, default: () => [] },
  records: { type: Object, default: () => ({}) }
})

defineEmits(['update:modelValue'])

const excludeAbsent = ref(false)
const rolling = ref(false)
const result = ref(null)
const previewName = ref('')
let timer = null
let stopTimer = null

const pool = computed(() => {
  if (!excludeAbsent.value) return props.students
  return props.students.filter((student) => (props.records[student.id] || 'present') !== 'present')
})

const statusText = computed(() => {
  if (!result.value) return ''
  const key = props.records[result.value.id] || 'present'
  return `当前状态：${STATUS_MAP[key]?.label || '出勤'}`
})

const stageColor = computed(() => {
  if (!result.value) return '#4f46e5'
  return STATUS_MAP[props.records[result.value.id] || 'present']?.color || '#4f46e5'
})

function start() {
  stop()
  if (!pool.value.length) return
  result.value = null
  rolling.value = true
  const list = pool.value
  timer = setInterval(() => {
    previewName.value = list[Math.floor(Math.random() * list.length)].name
  }, 70)
  stopTimer = setTimeout(() => {
    const picked = list[Math.floor(Math.random() * list.length)]
    stop()
    result.value = picked
  }, 1600)
}

function stop() {
  rolling.value = false
  if (timer) clearInterval(timer)
  if (stopTimer) clearTimeout(stopTimer)
  timer = null
  stopTimer = null
}

onBeforeUnmount(stop)
</script>

<style scoped>
.picker-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 4px 0 8px;
}

.picker-stage {
  width: 100%;
  min-height: 190px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: radial-gradient(circle at 50% 20%, rgba(79, 70, 229, 0.1), transparent 62%), #f7f8fd;
  border: 1px dashed #dcd9f6;
  transition: all 0.3s ease;
}

.picker-stage.landed {
  border-color: var(--stage);
  background: radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--stage) 16%, transparent), transparent 65%), #fff;
}

.picker-avatar {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.3);
  margin-bottom: 4px;
}

.rolling-avatar {
  animation: pop 0.28s ease infinite alternate;
}

@keyframes pop {
  from {
    transform: scale(0.96);
  }
  to {
    transform: scale(1.04);
  }
}

.picker-stage h3 {
  font-size: 30px;
  letter-spacing: 2px;
  animation: land 0.34s cubic-bezier(0.2, 1.3, 0.5, 1);
}

@keyframes land {
  from {
    transform: scale(1.25);
    opacity: 0.3;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.picker-stage p {
  font-size: 12px;
  letter-spacing: 1px;
}

.picker-status {
  margin-top: 2px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--stage);
  background: color-mix(in srgb, var(--stage) 12%, #fff);
}

.picker-empty {
  color: var(--muted);
  font-size: 13px;
}

.picker-hint {
  font-size: 12px;
  color: var(--muted);
}

.picker-switch {
  align-self: flex-end;
}

.picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
</style>
