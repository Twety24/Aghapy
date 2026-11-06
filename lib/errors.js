export function arabicError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'البريد الإلكتروني أو كلمة السر غير صحيحة.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'البريد ده مسجّل قبل كده. جرّب تسجيل الدخول.'
  if (m.includes('password should be at least')) return 'كلمة السر لازم تكون 8 حروف على الأقل.'
  if (m.includes('rate limit')) return 'حاولت مرات كتير. استنى شوية وجرّب تاني.'
  if (m.includes('email not confirmed')) return 'لازم تأكد بريدك من الرسالة اللي وصلتك الأول.'
  return 'حصل خطأ. جرّب تاني.'
}
