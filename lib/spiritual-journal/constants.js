export const JOURNAL_DAYS = [
  { offset: 0, label: 'السبت', labelEn: 'Saturday', short: 'س', shortEn: 'Sa' },
  { offset: 1, label: 'الأحد', labelEn: 'Sunday', short: 'ح', shortEn: 'Su' },
  { offset: 2, label: 'الاثنين', labelEn: 'Monday', short: 'ن', shortEn: 'M' },
  { offset: 3, label: 'الثلاثاء', labelEn: 'Tuesday', short: 'ث', shortEn: 'Tu' },
  { offset: 4, label: 'الأربعاء', labelEn: 'Wednesday', short: 'ر', shortEn: 'W' },
  { offset: 5, label: 'الخميس', labelEn: 'Thursday', short: 'خ', shortEn: 'Th' },
  { offset: 6, label: 'الجمعة', labelEn: 'Friday', short: 'ج', shortEn: 'F' }
]

export const AGPEYA_HOURS = [
  { id: 'matins', label: 'باكر', labelEn: 'Matins', sub: 'الصباح', subEn: 'Morning' },
  { id: 'third', label: 'الثالثة', labelEn: 'Third Hour', sub: '9 صباحًا', subEn: '9 AM' },
  { id: 'sixth', label: 'السادسة', labelEn: 'Sixth Hour', sub: '12 ظهرًا', subEn: '12 PM' },
  { id: 'ninth', label: 'التاسعة', labelEn: 'Ninth Hour', sub: '3 عصرًا', subEn: '3 PM' },
  { id: 'vespers', label: 'الغروب', labelEn: 'Vespers', sub: 'المساء', subEn: 'Evening' },
  { id: 'compline', label: 'النوم', labelEn: 'Compline', sub: 'قبل النوم', subEn: 'Before bed' },
  { id: 'midnight_first', label: 'نصف الليل 1', labelEn: 'Midnight 1', sub: 'الخدمة الأولى', subEn: 'First service' },
  { id: 'midnight_second', label: 'نصف الليل 2', labelEn: 'Midnight 2', sub: 'الخدمة الثانية', subEn: 'Second service' },
  { id: 'midnight_third', label: 'نصف الليل 3', labelEn: 'Midnight 3', sub: 'الخدمة الثالثة', subEn: 'Third service' }
]

export const EMPTY_ENTRY = {
  bible_reading: false,
  attended_liturgy: false,
  prayed: false,
  agpeya_hours: [],
  reflection: ''
}

export function toLocalISO(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

export function getWeekStart(date = new Date()) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceSaturday = (result.getDay() + 1) % 7
  result.setDate(result.getDate() - daysSinceSaturday)
  return result
}

export function addDays(dateString, amount) {
  const date = new Date(dateString + 'T12:00:00')
  date.setDate(date.getDate() + amount)
  return toLocalISO(date)
}
