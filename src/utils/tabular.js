import * as XLSX from 'xlsx'

function decodeText(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch (error) {
    try {
      return new TextDecoder('gbk').decode(buffer)
    } catch (err) {
      return new TextDecoder('utf-8').decode(buffer)
    }
  }
}

function detectDelimiter(line) {
  const candidates = [',', '\t', ';', '，']
  let best = ','
  let bestCount = -1
  candidates.forEach((sep) => {
    const count = line.split(sep).length
    if (count > bestCount) {
      best = sep
      bestCount = count
    }
  })
  return best
}

export function parseDelimited(text) {
  const content = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const firstLine = content.split('\n')[0] || ''
  const delimiter = detectDelimiter(firstLine)
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]
    if (inQuotes) {
      if (char === '"' && content[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(cell.trim())
      cell = ''
    } else if (char === '\n') {
      row.push(cell.trim())
      if (row.some((item) => item !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell.trim())
  if (row.some((item) => item !== '')) rows.push(row)
  return rows
}

export async function parseTableFile(file) {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
    return rows.map((row) => row.map((cell) => String(cell ?? '').trim()))
  }
  const buffer = await file.arrayBuffer()
  return parseDelimited(decodeText(buffer))
}

const HEADER_ALIASES = {
  sid: ['学号', '学生学号', '编号', 'sid', 'id', 'studentid', 'student id'],
  name: ['姓名', '学生姓名', '名字', 'name', 'studentname'],
  gender: ['性别', 'gender', 'sex'],
  group: ['分组', '小组', '组别', 'group', 'team']
}

function normalizeHeader(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase()
}

export function mapStudentRows(rows) {
  if (!rows.length) return { students: [], errors: [], headerFound: false }
  const headerRow = rows[0].map(normalizeHeader)
  const mapping = { sid: -1, name: -1, gender: -1, group: -1 }
  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    const index = headerRow.findIndex((cell) => aliases.includes(cell))
    mapping[field] = index
  })
  const headerFound = mapping.sid !== -1 || mapping.name !== -1
  if (!headerFound) {
    mapping.sid = 0
    mapping.name = 1
    mapping.gender = 2
    mapping.group = 3
  }

  const dataRows = headerFound ? rows.slice(1) : rows
  const seen = new Set()
  const students = dataRows.map((row, index) => {
    const student = {
      sid: mapping.sid >= 0 ? String(row[mapping.sid] || '').trim() : '',
      name: mapping.name >= 0 ? String(row[mapping.name] || '').trim() : '',
      gender: mapping.gender >= 0 ? String(row[mapping.gender] || '').trim() : '',
      group: mapping.group >= 0 ? String(row[mapping.group] || '').trim() : '',
      line: index + (headerFound ? 2 : 1),
      errors: []
    }
    if (!student.sid) student.errors.push('缺少学号')
    if (!student.name) student.errors.push('缺少姓名')
    if (student.sid && seen.has(student.sid)) student.errors.push('学号重复')
    if (student.sid) seen.add(student.sid)
    if (!student.gender) student.gender = '男'
    return student
  })

  return {
    students,
    headerFound,
    errors: students.filter((item) => item.errors.length > 0)
  }
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCsv(filename, header, rows) {
  const escape = (value) => {
    const text = String(value ?? '')
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [header, ...rows].map((row) => row.map(escape).join(','))
  downloadBlob(filename, new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }))
}

export function exportExcel(filename, sheetName, header, rows) {
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows])
  const widths = header.map((title, index) => {
    const values = rows.map((row) => String(row[index] ?? ''))
    const max = Math.max(String(title).length * 2, ...values.map((value) => value.length * 2))
    return { wch: Math.min(Math.max(max + 2, 10), 40) }
  })
  sheet['!cols'] = widths
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
  XLSX.writeFile(workbook, filename)
}
