// 演示用初始数据：两个班级、若干条历史考勤记录
const NAMES_A = [
  '陈子涵', '李佳琪', '王浩宇', '张思远', '刘雨桐', '赵梓萱', '黄睿', '周欣怡',
  '吴俊杰', '徐嘉怡', '孙博文', '马晓彤', '朱明轩', '胡雅静', '郭天宇', '何雯雯',
  '高子豪', '林诗雨', '罗嘉豪', '郑一诺', '梁晨曦', '谢宇辰', '宋佳慧', '唐宇航',
  '许若曦', '韩泽宇', '冯静怡', '邓子健', '曹梦琪', '彭嘉伟', '曾可欣', '萧梓豪',
  '田雨欣', '董家豪', '袁嘉敏', '潘文博', '蒋雨涵', '蔡子豪', '余思彤', '杜明远'
]

const NAMES_B = [
  '林一鸣', '苏语桐', '程子轩', '何嘉怡', '吕思远', '施雨欣', '张泽楷', '孔子萱',
  '范俊熙', '沈梦瑶', '金志远', '纪诗涵', '石浩然', '戴梦琪', '陆宇轩', '钟佳颖',
  '汪子豪', '任雨桐', '姜宇航', '崔嘉欣', '钱明远', '汤思琪', '卢子健', '尹雅雯',
  '葛天佑', '邹雨萌', '毛俊豪', '柳佳悦', '史文博', '费雨琪', '顾子昂', '鲁梦竹',
  '苗天宇', '章雨欣', '鲁嘉辉', '姜思远'
]

// 确定性伪随机，保证每次初始化数据一致
function makeRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function buildStudents(prefix, names, offset) {
  return names.map((name, index) => ({
    id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    sid: `${prefix}${String(index + 1).padStart(2, '0')}`,
    name,
    gender: index % 3 === 0 ? '女' : '男',
    group: `第${Math.floor(index / 10) + 1}组`
  }))
}

const PERIODS = ['第1-2节', '第3-4节', '第5-6节', '第7-8节']

export function createSeedData() {
  const classA = {
    id: 'class-a',
    name: '2023级软件工程1班',
    course: 'Web 前端开发',
    students: buildStudents('2023', NAMES_A, 0)
  }
  const classB = {
    id: 'class-b',
    name: '2023级软件工程2班',
    course: 'Web 前端开发',
    students: buildStudents('2024', NAMES_B, 0)
  }

  const random = makeRandom(20261001)
  const sessions = []
  const dates = ['2026-10-27', '2026-10-29', '2026-11-03', '2026-11-05', '2026-11-10', '2026-11-12']

  dates.forEach((date, index) => {
    const records = {}
    classA.students.forEach((student) => {
      const dice = random()
      let status = 'present'
      if (dice > 0.96) status = 'absent'
      else if (dice > 0.9) status = 'leave'
      else if (dice > 0.82) status = 'late'
      else if (dice > 0.8) status = 'early'
      records[student.id] = status
    })
    sessions.push({
      id: `session-seed-${index + 1}`,
      classId: classA.id,
      className: classA.name,
      course: classA.course,
      date,
      period: PERIODS[index % 2 === 0 ? 0 : 2],
      records,
      note: '',
      savedAt: `${date} 09:${String(10 + index).padStart(2, '0')}:00`
    })
  })

  return {
    classes: [classA, classB],
    sessions,
    activeClassId: classA.id,
    draft: null
  }
}

export { PERIODS }
