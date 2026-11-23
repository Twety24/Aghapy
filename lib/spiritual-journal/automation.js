import { AGPEYA_HOURS, JOURNAL_DAYS } from './constants'

export function buildWeeklyAutomation(entries = []) {
  const byDate = new Map(entries.map(entry => [entry.entry_date, entry]))
  const totals = {
    reading: entries.filter(entry => entry.bible_reading).length,
    liturgy: entries.filter(entry => entry.attended_liturgy).length,
    prayer: entries.filter(entry => entry.prayed).length,
    agpeya: entries.reduce((total, entry) => total + (entry.agpeya_hours || []).length, 0)
  }
  const activeDays = entries.filter(entry =>
    entry.bible_reading || entry.attended_liturgy || entry.prayed || (entry.agpeya_hours || []).length
  ).length
  const hourCounts = AGPEYA_HOURS.map(hour => ({
    ...hour,
    count: entries.filter(entry => (entry.agpeya_hours || []).includes(hour.id)).length
  })).filter(hour => hour.count > 0)
  const nextStep = totals.reading === 0
    ? 'ابدأ بقراءة جزء صغير من الإنجيل في وقت يناسبك.'
    : totals.prayer === 0
      ? 'جرّب تخصص وقت هادي للصلاة النهارده.'
      : totals.agpeya === 0
        ? 'ممكن تختار ساعة واحدة من الأجبية وتضيفها لروتينك.'
        : activeDays >= 5
          ? 'استمر على نفس الإيقاع، وخلي فيه وقت للتأمل كمان.'
          : 'اختار عادة واحدة بسيطة وارجع لها خلال الأيام الجاية.'
  return {
    totals,
    activeDays,
    completion: Math.round((activeDays / JOURNAL_DAYS.length) * 100),
    hourCounts,
    nextStep,
    hasActivity: byDate.size > 0
  }
}
