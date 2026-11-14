<template>
  <el-dialog
    :model-value="modelValue"
    title="导入学生名单"
    width="780px"
    align-center
    top="8vh"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="reset"
  >
    <div class="import-body">
      <template v-if="!allRows.length">
        <div
          class="drop-zone"
          :class="{ dragging }"
          @click="fileInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <div class="drop-icon"><el-icon><UploadFilled /></el-icon></div>
          <h4>拖拽文件到这里，或点击选择文件</h4>
          <p>支持 .xlsx / .xls / .csv / .txt，建议表头为：学号、姓名、性别、分组</p>
          <el-button type="primary" plain>选择文件</el-button>
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            class="file-input"
            @change="onFileChange"
          />
        </div>

        <div class="paste-block">
          <div class="paste-head">
            <span>或者直接粘贴名单</span>
            <div class="paste-actions">
              <el-button text type="primary" @click="downloadTemplate">
                <el-icon><Download /></el-icon>
                下载模板
              </el-button>
            </div>
          </div>
          <el-input
            v-model="pasteText"
            type="textarea"
            :rows="4"
            resize="none"
            placeholder="学号,姓名,性别,分组&#10;20230101,张三,男,第1组&#10;20230102,李四,女,第1组"
          />
          <div class="paste-foot">
            <span class="muted">支持逗号、制表符、分号分隔；无表头时默认第一列学号、第二列姓名</span>
            <el-button type="primary" plain :disabled="!pasteText.trim()" @click="parsePaste">
              解析内容
            </el-button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="preview-head">
          <div class="preview-title">
            识别到 <b class="mono">{{ allRows.length }}</b> 条数据 · 有效
            <b class="mono ok">{{ validRows.length }}</b> 条
            <span v-if="errorRows.length" class="err">
              · {{ errorRows.length }} 条存在学号或姓名问题，暂不导入
            </span>
            <span v-if="!headerFound" class="muted">（未检测到表头，已按列顺序解析）</span>
          </div>
          <el-button text @click="reset">
            <el-icon><RefreshLeft /></el-icon>
            重新选择
          </el-button>
        </div>

        <el-table :data="previewRows" height="286" size="small" class="preview-table">
          <el-table-column prop="line" label="行号" width="66" />
          <el-table-column prop="sid" label="学号" min-width="120" />
          <el-table-column prop="name" label="姓名" min-width="96" />
          <el-table-column prop="gender" label="性别" width="70" />
          <el-table-column prop="group" label="分组" width="90" />
          <el-table-column label="校验" min-width="120">
            <template #default="{ row }">
              <el-tag v-if="!row.errors.length" type="success" size="small" effect="light">通过</el-tag>
              <el-tag v-else type="danger" size="small" effect="light">{{ row.errors.join('、') }}</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="mode-row">
          <el-radio-group v-model="mode">
            <el-radio value="append">追加到现有名单</el-radio>
            <el-radio value="replace">覆盖现有名单</el-radio>
          </el-radio-group>
          <span class="muted">
            当前班级共 {{ existingCount }} 名学生{{ mode === 'replace' ? '，覆盖后将全部替换' : '，学号重复的学生会自动跳过' }}
          </span>
        </div>
      </template>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="!validRows.length" @click="confirmImport">
        <el-icon><Check /></el-icon>
        导入 {{ validRows.length }} 名学生
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAttendance } from '../store/attendance'
import { mapStudentRows, parseDelimited, parseTableFile, exportExcel } from '../utils/tabular'

defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'imported'])

const store = useAttendance()
const fileInput = ref(null)
const dragging = ref(false)
const pasteText = ref('')
const mode = ref('append')
const allRows = ref([])
const headerFound = ref(true)

const existingCount = computed(() => store.activeClass.value?.students.length || 0)
const validRows = computed(() => allRows.value.filter((row) => !row.errors.length))
const errorRows = computed(() => allRows.value.filter((row) => row.errors.length))
const previewRows = computed(() => allRows.value.slice(0, 200))

function apply(rawRows) {
  const result = mapStudentRows(rawRows.filter((row) => row.some((cell) => cell !== '')))
  allRows.value = result.students
  headerFound.value = result.headerFound
  if (!result.students.length) {
    ElMessage.warning('没有解析到有效数据，请检查文件内容')
    return
  }
  if (result.errors.length) {
    ElMessage.warning(`有 ${result.errors.length} 条数据需要修正，已标记为不导入`)
  }
}

async function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  await loadFile(file)
  event.target.value = ''
}

async function onDrop(event) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  await loadFile(file)
}

async function loadFile(file) {
  try {
    const rows = await parseTableFile(file)
    apply(rows)
    if (allRows.value.length) ElMessage.success(`已读取「${file.name}」`)
  } catch (error) {
    console.error(error)
    ElMessage.error('文件解析失败，请确认文件格式')
  }
}

function parsePaste() {
  const rows = parseDelimited(pasteText.value)
  apply(rows)
}

function reset() {
  allRows.value = []
  pasteText.value = ''
  mode.value = 'append'
  headerFound.value = true
}

function close() {
  emit('update:modelValue', false)
}

function confirmImport() {
  if (!validRows.value.length) return
  const rows = validRows.value.map((row) => ({
    sid: row.sid,
    name: row.name,
    gender: row.gender,
    group: row.group
  }))
  const result = store.importStudents(rows, mode.value)
  ElMessage.success(
    `导入完成：新增 ${result.added} 人${result.skipped ? `，跳过 ${result.skipped} 条（学号重复或缺失）` : ''}`
  )
  emit('imported', result)
  close()
}

function downloadTemplate() {
  exportExcel(
    '学生导入模板.xlsx',
    '学生名单',
    ['学号', '姓名', '性别', '分组'],
    [
      ['20230101', '张三', '男', '第1组'],
      ['20230102', '李四', '女', '第1组'],
      ['20230103', '王五', '男', '第2组']
    ]
  )
  ElMessage.success('模板已下载')
}
</script>

<style scoped>
.import-body {
  min-height: 300px;
}

.drop-zone {
  border: 1.5px dashed #d7dceb;
  border-radius: 14px;
  padding: 30px 20px;
  text-align: center;
  background: linear-gradient(180deg, #fafbff, #fff);
  cursor: pointer;
  transition: all 0.2s ease;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.drop-icon {
  width: 54px;
  height: 54px;
  margin: 0 auto 12px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 26px;
  color: var(--brand);
  background: #fff;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.14);
}

.drop-zone h4 {
  font-size: 15px;
  margin-bottom: 6px;
}

.drop-zone p {
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 14px;
}

.file-input {
  display: none;
}

.paste-block {
  margin-top: 16px;
  padding: 14px;
  border-radius: 13px;
  background: #f8f9fd;
  border: 1px solid var(--line);
}

.paste-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}

.paste-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.paste-foot .muted {
  font-size: 12px;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.preview-title {
  font-size: 13px;
  color: var(--ink-2);
}

.preview-title .ok {
  color: var(--green);
}

.preview-title .err {
  color: var(--red);
}

.preview-table {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.mode-row .muted {
  font-size: 12px;
}
</style>
