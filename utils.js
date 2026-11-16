// utils.js — یوتیلیتی‌های عمومی: فرمت پول، تولید شناسه، تقسیم دقیق

const Utils = (() => {
  /**
   * فرمت کردن یک عدد به صورت پول با جداکننده هزارگان و پسوند "تومان"
   * محاسبات داخلی همیشه باید با عدد خام (Number) انجام شوند؛
   * خروجی این تابع فقط برای نمایش است.
   */
  function formatMoney(amount, { withSuffix = true } = {}) {
    const rounded = Math.round(Number(amount) || 0);
    const formatted = new Intl.NumberFormat('fa-IR').format(Math.abs(rounded));
    const sign = rounded < 0 ? '−' : '';
    return withSuffix ? `${sign}${formatted} تومان` : `${sign}${formatted}`;
  }

  /** پارس کردن ورودی کاربر (که ممکن است جداکننده هزارگان داشته باشد) به عدد خام */
  function parseMoney(input) {
    if (typeof input === 'number') return input;
    const cleaned = String(input).replace(/[^\d.-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  /** تولید شناسه یکتای ساده، مستقل از نام یا مقدار */
  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * تقسیم یک مبلغ صحیح بین N نفر به گونه‌ای که:
   * - مجموع سهم‌ها دقیقاً برابر مبلغ اصلی باشد (بدون خطای اعشاری)
   * - باقی‌مانده تقسیم (به واحد تومان) بین نفرات اول توزیع شود
   * ورودی participantIds باید آرایه‌ای از شناسه‌ها باشد؛ خروجی Map شناسه -> سهم
   */
  function splitAmountEvenly(amount, participantIds) {
    const n = participantIds.length;
    const shares = new Map();
    if (n === 0) return shares;
    const total = Math.round(amount);
    const base = Math.floor(total / n);
    let remainder = total - base * n;
    participantIds.forEach((id, index) => {
      // نفرات اول (بر اساس ترتیب ورود) یک تومان اضافه می‌گیرند تا مجموع دقیق شود
      const extra = index < remainder ? 1 : 0;
      shares.set(id, base + extra);
    });
    return shares;
  }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function todayIso() {
    return new Date().toISOString();
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
    } catch {
      return '';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  return {
    formatMoney,
    parseMoney,
    generateId,
    splitAmountEvenly,
    debounce,
    todayIso,
    formatDate,
    escapeHtml,
  };
})();
