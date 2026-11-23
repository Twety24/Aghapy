export const JOURNAL_DAYS = [
  { offset: 0, label: 'السبت', short: 'س' },
  { offset: 1, label: 'الأحد', short: 'ح' },
  { offset: 2, label: 'الاثنين', short: 'ن' },
  { offset: 3, label: 'الثلاثاء', short: 'ث' },
  { offset: 4, label: 'الأربعاء', short: 'ر' },
  { offset: 5, label: 'الخميس', short: 'خ' },
  { offset: 6, label: 'الجمعة', short: 'ج' }
]

export const AGPEYA_HOURS = [
  { id: 'matins', label: 'باكر', sub: 'الصباح' },
  { id: 'third', label: 'الثالثة', sub: '9 صباحًا' },
  { id: 'sixth', label: 'السادسة', sub: '12 ظهرًا' },
  { id: 'ninth', label: 'التاسعة', sub: '3 عصرًا' },
  { id: 'vespers', label: 'الغروب', sub: 'المساء' },
  { id: 'compline', label: 'النوم', sub: 'قبل النوم' },
  { id: 'midnight_first', label: 'نصف الليل 1', sub: 'الخدمة الأولى' },
  { id: 'midnight_second', label: 'نصف الليل 2', sub: 'الخدمة الثانية' },
  { id: 'midnight_third', label: 'نصف الليل 3', sub: 'الخدمة الثالثة' }
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
