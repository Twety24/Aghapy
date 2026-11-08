import ExcelJS from 'exceljs'

const TZ = 'Africa/Cairo'
const day = (x) => new Date(x).toLocaleDateString('en-GB', { timeZone: TZ })
const time = (x) => new Date(x).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })

async function book(name, cols, rows) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true }] })
  ws.columns = cols.map(([header, key, width]) => ({ header, key, width }))
  ws.getRow(1).font = { bold: true }
  rows.forEach((r) => ws.addRow(r))
  return Buffer.from(await wb.xlsx.writeBuffer())
}

export const presentBuffer = (rows) =>
  book('Present', [['الاسم الكامل', 'name', 28], ['البريد الإلكتروني', 'email', 32], ['تاريخ الحضور', 'date', 16], ['وقت الحضور', 'time', 14], ['الحالة', 'status', 12]],
    rows.map((r) => ({ name: r.full_name, email: r.email, date: day(r.checked_in_at), time: time(r.checked_in_at), status: 'حاضر' })))

export const absentBuffer = (rows, meetingDate) =>
  book('Absent', [['الاسم الكامل', 'name', 28], ['البريد الإلكتروني', 'email', 32], ['تاريخ الاجتماع', 'date', 16], ['الحالة', 'status', 12]],
    rows.map((r) => ({ name: r.full_name, email: r.email, date: meetingDate, status: 'غائب' })))

const stageName = { prep: 'إعدادي', secondary: 'ثانوي', university: 'جامعة', working: 'بشتغل' }
const deptName = { acting: 'تمثيل', lighting: 'إضاءة', music: 'موسيقى', decor: 'ديكور', mime: 'مايم' }
export const membersBuffer = (rows) =>
  book('Members', [['الاسم الكامل', 'name', 28], ['البريد الإلكتروني', 'email', 32], ['رقم التليفون', 'phone', 20], ['تاريخ الميلاد', 'birth_date', 16], ['المرحلة', 'stage', 16], ['القسم', 'department', 20], ['الصلاحية', 'role', 12], ['الحالة', 'active', 12], ['تاريخ التسجيل', 'joined', 16]],
    rows.map((r) => ({ name: r.full_name, email: r.email, phone: r.phone || '', birth_date: r.birth_date || 'غير مسجل', stage: stageName[r.stage] || '', department: deptName[r.department] || '', role: r.role === 'admin' ? 'أدمن' : 'عضو', active: r.is_active ? 'فعّال' : 'موقوف', joined: day(r.created_at) })))
