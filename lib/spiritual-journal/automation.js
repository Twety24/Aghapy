import { AGPEYA_HOURS, JOURNAL_DAYS } from './constants'

export function buildWeeklyAutomation(entries = []) {
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
  const nextStepEn = totals.reading === 0
    ? 'Start with a short passage from the Bible at a time that works for you.'
    : totals.prayer === 0
      ? 'Try setting aside a quiet moment for prayer today.'
      : totals.agpeya === 0
        ? 'You could choose one Agpeya hour and make it part of your routine.'
        : activeDays >= 5
          ? 'Keep your rhythm, and leave room for reflection too.'
          : 'Choose one small habit to return to over the next few days.'
  return {
    totals,
    activeDays,
    completion: Math.round((activeDays / JOURNAL_DAYS.length) * 100),
    hourCounts,
    nextStep,
    nextStepEn,
    hasActivity: activeDays > 0
  }
}
