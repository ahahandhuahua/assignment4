<template>
  <div
    class="student-card"
    :class="[`is-${statusKey}`, { focused }]"
    :style="{ '--tone': tone.color, '--tone-soft': tone.soft }"
    tabindex="0"
    role="button"
    :aria-label="`${student.name} ${tone.label}`"
    @click="$emit('cycle')"
    @focus="focused = true"
    @blur="focused = false"
  >
    <div class="sc-head">
      <span class="avatar" :style="{ background: avatarBg }">{{ shortName }}</span>
      <div class="sc-meta">
        <strong>{{ student.name }}</strong>
        <span class="sid mono">{{ student.sid }}</span>
      </div>
      <span class="status-pill">
        <el-icon><component :is="tone.icon" /></el-icon>
        {{ tone.label }}
      </span>
    </div>

    <div class="sc-actions" @click.stop>
      <button
        v-for="item in STATUS_LIST"
        :key="item.key"
        type="button"
        class="status-btn"
        :class="{ active: item.key === statusKey }"
        :style="{ '--btn': item.color, '--btn-soft': item.soft }"
        :title="`标记为${item.label}`"
        @click="$emit('set', item.key)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { STATUS_LIST, STATUS_MAP } from '../store/attendance'

const props = defineProps({
  student: { type: Object, required: true },
  statusKey: { type: String, default: 'present' }
})

defineEmits(['cycle', 'set'])

const focused = ref(false)
const tone = computed(() => STATUS_MAP[props.statusKey] || STATUS_MAP.present)
const shortName = computed(() => props.student.name.slice(-2))

const AVATAR_COLORS = [
  'linear-gradient(135deg, #818cf8, #4f46e5)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #60a5fa, #2563eb)',
  'linear-gradient(135deg, #f472b6, #db2777)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)'
]

const avatarBg = computed(() => {
  const source = props.student.group || props.student.sid || props.student.name
  let hash = 0
  for (let i = 0; i < source.length; i += 1) hash = (hash + source.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[hash]
})
</script>

<style scoped>
.student-card {
  position: relative;
  padding: 10px 12px 8px;
  border-radius: 13px;
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  outline: none;
  overflow: hidden;
}

.student-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 3px;
  background: var(--tone);
  opacity: 0.85;
}

.student-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: #dcd6fb;
}

.student-card:focus-visible,
.student-card.focused {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14);
}

.student-card.is-late,
.student-card.is-leave,
.student-card.is-early,
.student-card.is-absent {
  background: linear-gradient(180deg, var(--tone-soft), #fff 78%);
}

.sc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.avatar {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 10px rgba(31, 41, 55, 0.16);
}

.sc-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.sc-meta strong {
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sid {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.2px;
}

.status-pill {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--tone);
  background: var(--tone-soft);
  transition: all 0.2s ease;
}

.status-pill .el-icon {
  font-size: 12px;
}

.sc-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px dashed #eef0f6;
}

.status-btn {
  flex: 1;
  height: 26px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #f6f7fb;
  color: #9aa3b5;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.status-btn:hover {
  color: var(--btn);
  background: var(--btn-soft);
}

.status-btn.active {
  color: var(--btn);
  background: var(--btn-soft);
  border-color: var(--btn);
  box-shadow: inset 0 0 0 1px var(--btn);
}
</style>
