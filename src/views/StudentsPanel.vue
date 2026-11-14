<template>
  <div class="panel">
    <section class="class-card card">
      <div class="class-main">
        <div class="class-emblem">
          <el-icon><School /></el-icon>
        </div>
        <div class="class-info">
          <div class="class-name-row">
            <h2>{{ activeClass?.name }}</h2>
            <el-tag v-if="activeClass?.course" size="small" effect="plain">{{ activeClass.course }}</el-tag>
          </div>
          <p class="class-sub">
            共 <b class="mono">{{ students.length }}</b> 名学生 ·
            平均出勤率 <b class="mono">{{ classStats.overallRate }}%</b> ·
            累计考勤 <b class="mono">{{ classStats.sessionCount }}</b> 次
          </p>
          <div class="group-tags" v-if="groupList.length">
            <span v-for="group in groupList" :key="group.name" class="group-tag">
              {{ group.name }} <em class="mono">{{ group.count }}</em>
            </span>
          </div>
        </div>
      </div>

      <div class="class-actions">
        <el-button type="primary" @click="importVisible = true">
          <el-icon><Upload /></el-icon>
          导入名单
        </el-button>
        <el-button @click="openAdd">
          <el-icon><Plus /></el-icon>
          添加学生
        </el-button>
        <el-button @click="exportRoster">
          <el-icon><Download /></el-icon>
          导出名单
        </el-button>
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button>
            班级管理
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">
                <el-icon><EditPen /></el-icon>编辑班级信息
              </el-dropdown-item>
              <el-dropdown-item command="create">
                <el-icon><FolderAdd /></el-icon>新建班级
              </el-dropdown-item>
              <el-dropdown-item command="template">
                <el-icon><Document /></el-icon>下载导入模板
              </el-dropdown-item>
              <el-dropdown-item command="remove" divided :disabled="store.state.classes.length <= 1">
                <el-icon><Delete /></el-icon>删除当前班级
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </section>

    <section class="table-card card">
      <div class="table-head">
        <div class="section-title">
          <span class="dot"></span>
          学生名单
          <span class="section-sub">按学号排序，可直接双击行编辑</span>
        </div>
        <el-input v-model="keyword" class="search" placeholder="搜索姓名 / 学号 / 分组" clearable>
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>

      <el-table
        v-if="students.length"
        :data="filteredStudents"
        class="roster-table"
        row-key="id"
        size="default"
        @row-dblclick="openEdit"
      >
        <el-table-column type="index" label="#" width="56" :index="(i) => i + 1" />
        <el-table-column prop="sid" label="学号" min-width="130">
          <template #default="{ row }">
            <span class="mono">{{ row.sid }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" min-width="110">
          <template #default="{ row }">
            <div class="name-cell">
              <span class="mini-avatar">{{ row.name.slice(-2) }}</span>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="82" />
        <el-table-column prop="group" label="分组" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.group" size="small" effect="plain" type="info">{{ row.group }}</el-tag>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="出勤率" width="150">
          <template #default="{ row }">
            <div class="rate-cell" v-if="rateOf(row.id) !== null">
              <el-progress
                :percentage="rateOf(row.id)"
                :stroke-width="7"
                :show-text="false"
                :color="rateColor(rateOf(row.id))"
              />
              <span class="mono">{{ rateOf(row.id) }}%</span>
            </div>
            <span v-else class="muted">暂无数据</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="removeStudent(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon"><el-icon><Search /></el-icon></div>
            <p>没有匹配的学生</p>
          </div>
        </template>
      </el-table>

      <div v-else class="empty-state">
        <div class="empty-icon"><el-icon><UserFilled /></el-icon></div>
        <p>还没有学生，导入一份名单即可开始考勤</p>
        <div class="empty-actions">
          <el-button type="primary" @click="importVisible = true">
            <el-icon><Upload /></el-icon>
            导入学生名单
          </el-button>
          <el-button @click="openAdd">手动添加</el-button>
        </div>
      </div>

      <div class="table-foot" v-if="students.length">
        <span class="muted">显示 {{ filteredStudents.length }} / {{ students.length }} 条</span>
        <span class="muted">双击任意一行可快速编辑学生信息</span>
      </div>
    </section>

    <ImportStudentsDialog v-model="importVisible" />

    <el-dialog
      v-model="studentDialog"
      :title="editingId ? '编辑学生信息' : '添加学生'"
      width="440px"
      align-center
      @closed="resetForm"
    >
      <el-form :model="form" label-width="72px" :rules="rules" ref="formRef" @submit.prevent>
        <el-form-item label="学号" prop="sid">
          <el-input v-model="form.sid" placeholder="如 20230101" maxlength="24" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入学生姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio value="男">男</el-radio>
            <el-radio value="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分组">
          <el-input v-model="form.group" placeholder="选填，如 第1组" maxlength="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="studentDialog = false">取消</el-button>
        <el-button type="primary" @click="submitStudent">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="classDialog"
      :title="classMode === 'create' ? '新建班级' : '编辑班级信息'"
      width="440px"
      align-center
    >
      <el-form :model="classForm" label-width="80px" @submit.prevent>
        <el-form-item label="班级名称">
          <el-input v-model="classForm.name" maxlength="30" placeholder="如 2023级软件工程1班" />
        </el-form-item>
        <el-form-item label="课程名称">
          <el-input v-model="classForm.course" maxlength="30" placeholder="选填，如 Web 前端开发" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="classDialog = false">取消</el-button>
        <el-button type="primary" @click="submitClass">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAttendance } from '../store/attendance'
import ImportStudentsDialog from '../components/ImportStudentsDialog.vue'
import { exportExcel } from '../utils/tabular'

const store = useAttendance()
const { students, activeClass, classStats } = store

const keyword = ref('')
const importVisible = ref(false)
const studentDialog = ref(false)
const classDialog = ref(false)
const classMode = ref('edit')
const editingId = ref(null)
const formRef = ref(null)

const form = reactive({ sid: '', name: '', gender: '男', group: '' })
const classForm = reactive({ name: '', course: '' })

const rules = {
  sid: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const groupList = computed(() => {
  const map = new Map()
  students.value.forEach((student) => {
    const key = student.group || '未分组'
    map.set(key, (map.get(key) || 0) + 1)
  })
  return [...map.entries()].map(([name, count]) => ({ name, count }))
})

const filteredStudents = computed(() => {
  const word = keyword.value.trim().toLowerCase()
  const list = students.value.slice().sort((a, b) => String(a.sid).localeCompare(String(b.sid)))
  if (!word) return list
  return list.filter(
    (student) =>
      student.name.toLowerCase().includes(word) ||
      String(student.sid).toLowerCase().includes(word) ||
      String(student.group || '').toLowerCase().includes(word)
  )
})

const rateMap = computed(() => {
  const map = {}
  classStats.value.perStudent.forEach((student) => {
    map[student.id] = student.rate
  })
  return map
})

function rateOf(id) {
  const rate = rateMap.value[id]
  return rate === undefined ? null : rate
}

function rateColor(rate) {
  if (rate >= 95) return '#16a34a'
  if (rate >= 85) return '#4f46e5'
  if (rate >= 70) return '#f59e0b'
  return '#ef4444'
}

function openAdd() {
  editingId.value = null
  Object.assign(form, { sid: '', name: '', gender: '男', group: '' })
  studentDialog.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, { sid: row.sid, name: row.name, gender: row.gender, group: row.group })
  studentDialog.value = true
}

function resetForm() {
  editingId.value = null
  formRef.value?.clearValidate()
}

async function submitStudent() {
  try {
    await formRef.value?.validate()
  } catch (error) {
    return
  }
  const sid = form.sid.trim()
  const duplicated = students.value.some(
    (student) => student.sid === sid && student.id !== editingId.value
  )
  if (duplicated) {
    ElMessage.warning(`学号 ${sid} 已存在，请检查`)
    return
  }
  if (editingId.value) {
    store.updateStudent(editingId.value, {
      sid,
      name: form.name.trim(),
      gender: form.gender,
      group: form.group.trim()
    })
    ElMessage.success('学生信息已更新')
  } else {
    store.addStudent({ sid, name: form.name, gender: form.gender, group: form.group })
    ElMessage.success('学生已添加')
  }
  studentDialog.value = false
}

async function removeStudent(row) {
  try {
    await ElMessageBox.confirm(`确定将「${row.name}」移出本班名单吗？`, '删除学生', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch (error) {
    return
  }
  store.removeStudent(row.id)
  ElMessage.success('已删除')
}

function exportRoster() {
  if (!students.value.length) {
    ElMessage.warning('当前班级还没有学生')
    return
  }
  const rows = filteredStudents.value.map((student) => {
    const rate = rateOf(student.id)
    return [student.sid, student.name, student.gender, student.group, rate === null ? '暂无' : `${rate}%`]
  })
  exportExcel(
    `${activeClass.value.name}-学生名单.xlsx`,
    '学生名单',
    ['学号', '姓名', '性别', '分组', '出勤率'],
    rows
  )
  ElMessage.success('名单已导出')
}

function handleCommand(command) {
  if (command === 'edit') {
    classMode.value = 'edit'
    Object.assign(classForm, {
      name: activeClass.value.name,
      course: activeClass.value.course || ''
    })
    classDialog.value = true
  } else if (command === 'create') {
    classMode.value = 'create'
    Object.assign(classForm, { name: '', course: '' })
    classDialog.value = true
  } else if (command === 'template') {
    exportExcel(
      '学生导入模板.xlsx',
      '学生名单',
      ['学号', '姓名', '性别', '分组'],
      [
        ['20230101', '张三', '男', '第1组'],
        ['20230102', '李四', '女', '第1组']
      ]
    )
    ElMessage.success('模板已下载')
  } else if (command === 'remove') {
    removeClass()
  }
}

async function submitClass() {
  if (!classForm.name.trim()) {
    ElMessage.warning('请填写班级名称')
    return
  }
  if (classMode.value === 'create') {
    const cls = store.addClass({ name: classForm.name.trim(), course: classForm.course.trim() })
    store.setActiveClass(cls.id)
    ElMessage.success('班级已创建，接下来可以导入学生名单')
  } else {
    store.updateClass(activeClass.value.id, {
      name: classForm.name.trim(),
      course: classForm.course.trim()
    })
    ElMessage.success('班级信息已更新')
  }
  classDialog.value = false
}

async function removeClass() {
  try {
    await ElMessageBox.confirm(
      `删除「${activeClass.value.name}」后，该班级的学生与考勤记录都会被清除，且不可恢复。`,
      '删除班级',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch (error) {
    return
  }
  if (store.removeClass(activeClass.value.id)) ElMessage.success('班级已删除')
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.class-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  flex-wrap: wrap;
  background: linear-gradient(120deg, rgba(79, 70, 229, 0.06), rgba(255, 255, 255, 0) 55%), #fff;
}

.class-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.class-emblem {
  width: 52px;
  height: 52px;
  flex: none;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 24px;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.26);
}

.class-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.class-name-row h2 {
  font-size: 19px;
  letter-spacing: 0.3px;
}

.class-sub {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--muted);
}

.class-sub b {
  color: var(--ink);
  font-weight: 600;
}

.group-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.group-tag {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  color: var(--ink-2);
  background: #f4f5fa;
  border: 1px solid var(--line);
}

.group-tag em {
  font-style: normal;
  color: var(--brand);
  margin-left: 2px;
}

.class-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.table-card {
  padding: 16px 18px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.search {
  width: 250px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-avatar {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 10.5px;
  color: var(--brand-dark);
  background: var(--brand-soft);
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
  font-size: 12px;
  color: var(--ink-2);
  width: 42px;
  text-align: right;
}

.table-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
}
</style>
