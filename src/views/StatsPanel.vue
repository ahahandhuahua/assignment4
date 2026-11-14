<template>
  <div class="panel">
    <section class="kpi-grid">
      <div class="kpi card">
        <span class="kpi-icon brand"><el-icon><DataLine /></el-icon></span>
        <div>
          <p class="kpi-label">累计考勤</p>
          <strong class="kpi-value mono">{{ classStats.sessionCount }}<em>次</em></strong>
        </div>
      </div>
      <div class="kpi card">
        <span class="kpi-icon green"><el-icon><TrendCharts /></el-icon></span>
        <div>
          <p class="kpi-label">平均出勤率</p>
          <strong class="kpi-value mono">{{ classStats.overallRate }}<em>%</em></strong>
        </div>
      </div>
      <div class="kpi card">
        <span class="kpi-icon amber"><el-icon><Medal /></el-icon></span>
        <div>
          <p class="kpi-label">全勤学生</p>
          <strong class="kpi-value mono">{{ classStats.perfect }}<em>人</em></strong>
        </div>
      </div>
      <div class="kpi card">
        <span class="kpi-icon red"><el-icon><WarningFilled /></el-icon></span>
        <div>
          <p class="kpi-label">需关注学生</p>
          <strong class="kpi-value mono">{{ classStats.risk.length }}<em>人</em></strong>
        </div>
      </div>
    </section>

    <template v-if="classStats.sessionCount">
      <div class="charts-row">
        <section class="chart-card card trend-card">
          <div class="section-head">
            <div class="section-title">
              <span class="dot"></span>
              出勤率趋势
              <span class="section-sub">最近 {{ classStats.trend.length }} 次考勤</span>
            </div>
            <el-tag size="small" effect="light" type="info">按出勤率（含迟到、早退）</el-tag>
          </div>

          <svg class="trend-svg" :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.24" />
                <stop offset="100%" stop-color="#4f46e5" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g>
              <line
                v-for="tick in chart.ticks"
                :key="tick.value"
                :x1="chart.padding"
                :x2="chart.width - chart.padding"
                :y1="tick.y"
                :y2="tick.y"
                stroke="#eef1f7"
                stroke-width="1"
              />
              <text
                v-for="tick in chart.ticks"
                :key="`label-${tick.value}`"
                :x="chart.padding - 8"
                :y="tick.y + 4"
                text-anchor="end"
                class="axis-label"
              >
                {{ tick.value }}%
              </text>
            </g>
            <path :d="chart.areaPath" fill="url(#areaGradient)" />
            <path :d="chart.linePath" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round" />
            <g v-for="(point, index) in chart.points" :key="index">
              <circle :cx="point.x" :cy="point.y" r="4.5" fill="#fff" stroke="#4f46e5" stroke-width="2.5">
                <title>{{ point.date }} {{ point.period }}：{{ point.rate }}%</title>
              </circle>
              <text :x="point.x" :y="point.y - 12" text-anchor="middle" class="point-label">
                {{ point.rate }}
              </text>
              <text
                :x="point.x"
                :y="chart.height - 14"
                text-anchor="middle"
                class="axis-label"
              >
                {{ point.date.slice(5) }}
              </text>
            </g>
          </svg>
        </section>

        <section class="chart-card card">
          <div class="section-head">
            <div class="section-title">
              <span class="dot"></span>
              状态分布
              <span class="section-sub">全部考勤累计</span>
            </div>
          </div>
          <div class="donut-wrap">
            <svg viewBox="0 0 42 42" class="donut">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f1f3f9" stroke-width="6" />
              <circle
                v-for="segment in donut"
                :key="segment.key"
                cx="21"
                cy="21"
                r="15.9"
                fill="none"
                :stroke="segment.color"
                stroke-width="6"
                :stroke-dasharray="`${segment.length} ${100 - segment.length}`"
                :stroke-dashoffset="-segment.offset"
                transform="rotate(-90 21 21)"
                stroke-linecap="butt"
              />
            </svg>
            <div class="donut-center">
              <strong class="mono">{{ classStats.overallRate }}%</strong>
              <span>总出勤率</span>
            </div>
          </div>
          <ul class="legend">
            <li v-for="item in statusSummary" :key="item.key">
              <i :style="{ background: item.color }"></i>
              <span>{{ item.label }}</span>
              <em class="mono">{{ item.count }}</em>
            </li>
          </ul>
        </section>
      </div>

      <section class="card ranking">
        <div class="section-head">
          <div class="section-title">
            <span class="dot"></span>
            学生出勤排行
            <span class="section-sub">可点击表头排序</span>
          </div>
          <el-button @click="exportStats">
            <el-icon><Download /></el-icon>
            导出统计表
          </el-button>
        </div>
        <el-table
          :data="classStats.perStudent"
          height="420"
          :default-sort="{ prop: 'rate', order: 'descending' }"
          size="small"
        >
          <el-table-column type="index" label="#" width="52" />
          <el-table-column prop="sid" label="学号" width="120" sortable />
          <el-table-column prop="name" label="姓名" width="96" />
          <el-table-column prop="group" label="分组" width="90">
            <template #default="{ row }">
              <span class="muted">{{ row.group || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="present" label="出勤" width="70" align="center" />
          <el-table-column prop="late" label="迟到" width="70" align="center" />
          <el-table-column prop="leave" label="请假" width="70" align="center" />
          <el-table-column prop="early" label="早退" width="70" align="center" />
          <el-table-column prop="absent" label="缺勤" width="70" align="center" />
          <el-table-column prop="rate" label="出勤率" min-width="180" sortable>
            <template #default="{ row }">
              <div class="rate-cell" v-if="row.rate !== null">
                <el-progress
                  :percentage="row.rate"
                  :stroke-width="7"
                  :show-text="false"
                  :color="rateColor(row.rate)"
                />
                <span class="mono">{{ row.rate }}%</span>
              </div>
              <span v-else class="muted">暂无数据</span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>

    <section v-else class="card">
      <div class="empty-state">
        <div class="empty-icon"><el-icon><PieChart /></el-icon></div>
        <p>还没有考勤数据，保存一次考勤后即可查看统计分析</p>
        <el-button type="primary" plain style="margin-top: 14px" @click="$emit('navigate', 'attendance')">
          去考勤面板
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAttendance, STATUS_LIST } from '../store/attendance'
import { exportExcel } from '../utils/tabular'

defineEmits(['navigate'])

const store = useAttendance()
const { classStats, activeClass } = store

const statusSummary = computed(() => {
  const totals = classStats.value.totals
  return STATUS_LIST.map((item) => ({
    ...item,
    count: totals[item.key] || 0
  }))
})

const donut = computed(() => {
  const total = classStats.value.totals.total || 1
  let offset = 0
  return statusSummary.value
    .filter((item) => item.count > 0)
    .map((item) => {
      const length = (item.count / total) * 100
      const segment = { ...item, length, offset }
      offset += length
      return segment
    })
})

const chart = computed(() => {
  const trend = classStats.value.trend
  const width = 640
  const height = 236
  const padding = 46
  const rates = trend.map((item) => item.rate)
  const minRate = rates.length ? Math.min(...rates) : 0
  const yMin = Math.max(0, Math.floor(minRate / 10) * 10 - 10)
  const yMax = 100
  const span = yMax - yMin || 1
  const innerW = width - padding * 2
  const innerH = height - padding - 26
  const points = trend.map((item, index) => {
    const x = trend.length === 1 ? width / 2 : padding + (index * innerW) / (trend.length - 1)
    const y = padding + innerH - ((item.rate - yMin) / span) * innerH
    return { ...item, x, y }
  })
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padding + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding + innerH).toFixed(1)} Z`
    : ''
  const ticks = [0, 1, 2, 3].map((index) => {
    const value = Math.round(yMin + (span * index) / 3)
    const y = padding + innerH - ((value - yMin) / span) * innerH
    return { value, y }
  })
  return { width, height, padding, points, linePath, areaPath, ticks }
})

function rateColor(rate) {
  if (rate >= 95) return '#16a34a'
  if (rate >= 85) return '#4f46e5'
  if (rate >= 70) return '#f59e0b'
  return '#ef4444'
}

function exportStats() {
  const rows = classStats.value.perStudent.map((student) => [
    student.sid,
    student.name,
    student.group || '',
    student.present,
    student.late,
    student.leave,
    student.early,
    student.absent,
    student.total,
    student.rate === null ? '暂无' : `${student.rate}%`
  ])
  exportExcel(
    `${activeClass.value.name}-考勤统计.xlsx`,
    '出勤统计',
    ['学号', '姓名', '分组', '出勤', '迟到', '请假', '早退', '缺勤', '应到次数', '出勤率'],
    rows
  )
  ElMessage.success('统计表已导出')
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.kpi-icon {
  width: 46px;
  height: 46px;
  flex: none;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.kpi-icon.brand {
  color: #4f46e5;
  background: #eef0ff;
}

.kpi-icon.green {
  color: #16a34a;
  background: #e7f8ee;
}

.kpi-icon.amber {
  color: #f59e0b;
  background: #fef4e2;
}

.kpi-icon.red {
  color: #ef4444;
  background: #fdeaea;
}

.kpi-label {
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 3px;
}

.kpi-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}

.kpi-value em {
  font-style: normal;
  font-size: 12px;
  color: var(--muted);
  margin-left: 3px;
  font-weight: 500;
}

.charts-row {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
  gap: 14px;
}

.chart-card {
  padding: 18px;
}

.trend-svg {
  width: 100%;
  height: auto;
  margin-top: 6px;
}

.axis-label {
  font-size: 10px;
  fill: #9aa3b5;
}

.point-label {
  font-size: 10px;
  fill: #4f46e5;
  font-weight: 600;
}

.donut-wrap {
  position: relative;
  width: 176px;
  height: 176px;
  margin: 8px auto 6px;
}

.donut {
  width: 100%;
  height: 100%;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.donut-center strong {
  font-size: 26px;
}

.donut-center span {
  font-size: 11.5px;
  color: var(--muted);
}

.legend {
  list-style: none;
  padding: 0;
  margin: 6px 0 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--ink-2);
}

.legend i {
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

.legend em {
  margin-left: auto;
  font-style: normal;
  color: var(--ink);
  font-weight: 600;
}

.ranking {
  padding: 18px;
}

.rate-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rate-cell :deep(.el-progress) {
  flex: 1;
}

.rate-cell span {
  width: 46px;
  text-align: right;
  font-size: 12px;
  color: var(--ink-2);
}

@media (max-width: 1000px) {
  .charts-row {
    grid-template-columns: 1fr;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
