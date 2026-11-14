import { reactive, computed, watch } from 'vue'
import { createSeedData, PERIODS } from '../data/seed'

const STORAGE_KEY = 'classroom-attendance-v1'

export const PERIOD_OPTIONS = PERIODS

export const STATUS_LIST = [
  { key: 'present', label: '出勤', icon: 'CircleCheckFilled', color: '#16a34a', soft: '#e7f8ee' },
  { key: 'late', label: '迟到', icon: 'Timer', color: '#f59e0b', soft: '#fef4e2' },
  { key: 'leave', label: '请假', icon: 'Document', color: '#3b82f6', soft: '#e8f1fe' },
  { key: 'early', label: '早退', icon: 'SwitchButton', color: '#8b5cf6', soft: '#f2ecfe' },
  { key: 'absent', label: '缺勤', icon: 'CircleCloseFilled', color: '#ef4444', soft: '#fdeaea' }
]

export const STATUS_MAP = STATUS_LIST.reduce((acc, item) => {
  acc[item.key] = item
  return acc
}, {})

const CYCLE = ['present', 'late', 'leave', 'early', 'absent']

function pad(n) {
  return String(n).padStart(2, '0')
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function nowStr() {
  const d = new Date()
  return `${todayStr()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function load() {
  let data = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) data = JSON.parse(raw)
  } catch (error) {
    console.warn('读取本地考勤数据失败，已使用初始数据', error)
  }
  if (!data || !Array.isArray(data.classes) || data.classes.length === 0) {
    data = createSeedData()
  }
  if (!Array.isArray(data.sessions)) data.sessions = []
  if (!data.classes.some((item) => item.id === data.activeClassId)) {
    data.activeClassId = data.classes[0].id
  }
  return data
}

const state = reactive(load())
const meta = reactive({ canUndo: false, undo: null })

function buildRecords(classId, date, period) {
  const cls = state.classes.find((item) => item.id === classId)
  const session = state.sessions.find(
    (item) => item.classId === classId && item.date === date && item.period === period
  )
  const records = {}
  ;(cls?.students || []).forEach((student) => {
    records[student.id] = session?.records?.[student.id] || 'present'
  })
  return records
}

function ensureDraft(classId = state.activeClassId, date, period) {
  const finalDate = date || state.draft?.date || todayStr()
  const finalPeriod = period || state.draft?.period || PERIOD_OPTIONS[0]
  state.draft = {
    classId,
    date: finalDate,
    period: finalPeriod,
    records: buildRecords(classId, finalDate, finalPeriod)
  }
}

if (!state.draft || state.draft.classId !== state.activeClassId) {
  ensureDraft()
}

watch(
  state,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch (error) {
      console.warn('本地保存失败', error)
    }
  },
  { deep: true }
)

const activeClass = computed(() => {
  return state.classes.find((item) => item.id === state.activeClassId) || state.classes[0]
})

const students = computed(() => activeClass.value?.students || [])

const draft = computed(() => state.draft)

export function summarize(records) {
  const counts = { present: 0, late: 0, leave: 0, absent: 0, early: 0 }
  let total = 0
  Object.values(records || {}).forEach((value) => {
    if (counts[value] === undefined) return
    counts[value] += 1
    total += 1
  })
  const attended = counts.present + counts.late + counts.early
  return {
    ...counts,
    total,
    attended,
    unmarked: Math.max(0, total - attended - counts.leave - counts.absent),
    rate: total ? Math.round((attended / total) * 1000) / 10 : 0
  }
}

const draftSummary = computed(() => summarize(state.draft?.records))

const sessionExists = computed(() => {
  if (!state.draft) return false
  return state.sessions.some(
    (item) =>
      item.classId === state.draft.classId &&
      item.date === state.draft.date &&
      item.period === state.draft.period
  )
})

const classSessions = computed(() => {
  return state.sessions
    .filter((item) => item.classId === state.activeClassId)
    .slice()
    .sort((a, b) => {
      const keyA = `${a.date} ${a.savedAt || ''}`
      const keyB = `${b.date} ${b.savedAt || ''}`
      return keyB.localeCompare(keyA)
    })
})

const allSessions = computed(() => {
  return state.sessions
    .slice()
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))
})

const classStats = computed(() => {
  const cls = activeClass.value
  const list = state.sessions.filter((item) => item.classId === cls?.id)
  const perStudent = (cls?.students || []).map((student) => {
    const result = {
      ...student,
      present: 0,
      late: 0,
      leave: 0,
      absent: 0,
      early: 0,
      total: 0,
      attended: 0,
      rate: null
    }
    list.forEach((session) => {
      const value = session.records?.[student.id]
      if (!value || result[value] === undefined) return
      result[value] += 1
      result.total += 1
    })
    result.attended = result.present + result.late + result.early
    result.rate = result.total ? Math.round((result.attended / result.total) * 1000) / 10 : null
    return result
  })

  const totals = { present: 0, late: 0, leave: 0, absent: 0, early: 0, total: 0, attended: 0 }
  perStudent.forEach((student) => {
    totals.present += student.present
    totals.late += student.late
    totals.leave += student.leave
    totals.absent += student.absent
    totals.early += student.early
    totals.total += student.total
    totals.attended += student.attended
  })
  const overallRate = totals.total ? Math.round((totals.attended / totals.total) * 1000) / 10 : 0

  const trend = list
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10)
    .map((session) => {
      const summary = summarize(session.records)
      return {
        id: session.id,
        date: session.date,
        period: session.period,
        rate: summary.rate,
        summary
      }
    })

  const ranked = perStudent
    .filter((student) => student.total > 0)
    .slice()
    .sort((a, b) => b.rate - a.rate || a.sid.localeCompare(b.sid))

  const fullAttendance = perStudent.filter(
    (student) => student.total > 0 && student.leave === 0 && student.absent === 0 && student.late === 0
  )

  const perfect = fullAttendance.length
  const risk = ranked.slice(-3).reverse().filter((student) => student.rate < 90)

  return {
    sessionCount: list.length,
    totals,
    overallRate,
    perStudent,
    trend,
    ranked,
    perfect,
    risk
  }
})

function pushUndo(label) {
  if (!state.draft) return
  meta.undo = {
    label,
    classId: state.draft.classId,
    date: state.draft.date,
    period: state.draft.period,
    records: { ...state.draft.records }
  }
  meta.canUndo = true
}

function undo() {
  const snapshot = meta.undo
  if (!snapshot) return false
  if (
    !state.draft ||
    state.draft.classId !== snapshot.classId ||
    state.draft.date !== snapshot.date ||
    state.draft.period !== snapshot.period
  ) {
    meta.canUndo = false
    meta.undo = null
    return false
  }
  state.draft.records = { ...snapshot.records }
  meta.canUndo = false
  meta.undo = null
  return true
}

function setStatus(studentId, status) {
  if (!state.draft || !status) return
  if (state.draft.records[studentId] === status) return
  pushUndo('修改考勤状态')
  state.draft.records[studentId] = status
}

function cycleStatus(studentId) {
  if (!state.draft) return
  const current = state.draft.records[studentId] || 'present'
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
  setStatus(studentId, next)
}

function markMany(status, ids) {
  if (!state.draft || !ids?.length) return
  pushUndo('批量标记')
  ids.forEach((id) => {
    state.draft.records[id] = status
  })
}

function resetDraft() {
  pushUndo('重置考勤')
  Object.keys(state.draft.records).forEach((key) => {
    state.draft.records[key] = 'present'
  })
}

function setDraftDate(date) {
  ensureDraft(state.draft.classId, date, state.draft.period)
  meta.canUndo = false
}

function setDraftPeriod(period) {
  ensureDraft(state.draft.classId, state.draft.date, period)
  meta.canUndo = false
}

function setActiveClass(classId) {
  if (state.activeClassId === classId) return
  state.activeClassId = classId
  ensureDraft(classId)
  meta.canUndo = false
}

function addClass(payload) {
  const cls = {
    id: `class-${Date.now()}`,
    name: payload.name,
    course: payload.course || '',
    students: []
  }
  state.classes.push(cls)
  return cls
}

function updateClass(classId, patch) {
  const cls = state.classes.find((item) => item.id === classId)
  if (!cls) return
  Object.assign(cls, patch)
  state.sessions.forEach((session) => {
    if (session.classId === classId) {
      session.className = cls.name
      session.course = cls.course
    }
  })
}

function removeClass(classId) {
  if (state.classes.length <= 1) return false
  state.classes = state.classes.filter((item) => item.id !== classId)
  state.sessions = state.sessions.filter((item) => item.classId !== classId)
  if (state.activeClassId === classId) {
    state.activeClassId = state.classes[0].id
    ensureDraft(state.activeClassId)
  }
  return true
}

function addStudent(payload) {
  const cls = activeClass.value
  const student = {
    id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sid: String(payload.sid || '').trim(),
    name: String(payload.name || '').trim(),
    gender: payload.gender || '男',
    group: payload.group || ''
  }
  cls.students.push(student)
  if (state.draft?.records && state.draft.records[student.id] === undefined) {
    state.draft.records[student.id] = 'present'
  }
  return student
}

function updateStudent(studentId, patch) {
  const student = activeClass.value.students.find((item) => item.id === studentId)
  if (!student) return
  Object.assign(student, patch)
}

function removeStudent(studentId) {
  const cls = activeClass.value
  cls.students = cls.students.filter((item) => item.id !== studentId)
  if (state.draft?.records) delete state.draft.records[studentId]
}

function importStudents(rows, mode = 'append') {
  const cls = activeClass.value
  const existing = new Set(cls.students.map((item) => item.sid))
  const previousRecords = { ...(state.draft?.records || {}) }
  if (mode === 'replace') {
    cls.students = []
    existing.clear()
  }
  let added = 0
  let skipped = 0
  rows.forEach((row) => {
    const sid = String(row.sid || '').trim()
    const name = String(row.name || '').trim()
    if (!sid || !name || existing.has(sid)) {
      skipped += 1
      return
    }
    cls.students.push({
      id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sid,
      name,
      gender: row.gender || '男',
      group: row.group || ''
    })
    existing.add(sid)
    added += 1
  })
  ensureDraft(state.activeClassId, state.draft.date, state.draft.period)
  Object.entries(previousRecords).forEach(([id, value]) => {
    if (state.draft.records[id] !== undefined) state.draft.records[id] = value
  })
  return { added, skipped }
}

function saveDraft() {
  const current = state.draft
  if (!current) return null
  const cls = state.classes.find((item) => item.id === current.classId)
  if (!cls) return null
  const validIds = new Set(cls.students.map((item) => item.id))
  const records = {}
  Object.entries(current.records || {}).forEach(([key, value]) => {
    if (validIds.has(key)) records[key] = value
  })
  const existing = state.sessions.find(
    (item) =>
      item.classId === current.classId && item.date === current.date && item.period === current.period
  )
  if (existing) {
    existing.records = records
    existing.savedAt = nowStr()
    existing.className = cls.name
    existing.course = cls.course
    return { mode: 'update', session: existing }
  }
  const session = {
    id: `session-${Date.now()}`,
    classId: current.classId,
    className: cls.name,
    course: cls.course,
    date: current.date,
    period: current.period,
    records,
    note: '',
    savedAt: nowStr()
  }
  state.sessions.unshift(session)
  return { mode: 'create', session }
}

function removeSession(sessionId) {
  state.sessions = state.sessions.filter((item) => item.id !== sessionId)
}

function resetAllData() {
  const fresh = createSeedData()
  state.classes = fresh.classes
  state.sessions = fresh.sessions
  state.activeClassId = fresh.activeClassId
  ensureDraft(fresh.activeClassId)
  meta.canUndo = false
}

const store = {
  state,
  meta,
  activeClass,
  students,
  draft,
  draftSummary,
  sessionExists,
  classSessions,
  allSessions,
  classStats,
  setStatus,
  cycleStatus,
  markMany,
  resetDraft,
  setDraftDate,
  setDraftPeriod,
  setActiveClass,
  addClass,
  updateClass,
  removeClass,
  addStudent,
  updateStudent,
  removeStudent,
  importStudents,
  saveDraft,
  removeSession,
  resetAllData,
  undo
}

export function useAttendance() {
  return store
}
