// expenses.js — ثبت، ویرایش و حذف هزینه‌ها + اعتبارسنجی

const Expenses = (() => {
  /** @returns {string[]} لیست پیام‌های خطا؛ آرایه خالی یعنی معتبر است */
  function validate({ title, amount, paidBy, participants }) {
    const errors = [];
    if (!title || !title.trim()) errors.push('لطفاً عنوان هزینه را وارد کنید.');
    if (!amount || Number(amount) <= 0) errors.push('لطفاً مبلغی بیشتر از صفر وارد کنید.');
    if (!paidBy) errors.push('لطفاً پرداخت‌کننده را انتخاب کنید.');
    if (!participants || participants.length === 0)
      errors.push('لطفاً حداقل یک نفر را به عنوان استفاده‌کننده انتخاب کنید.');
    return errors;
  }

  function addExpense(tripId, data) {
    const errors = validate(data);
    if (errors.length) return { ok: false, errors };

    const trip = Storage.getTrip(tripId);
    const expense = {
      id: Utils.generateId('expense'),
      title: data.title.trim(),
      amount: Math.round(Utils.parseMoney(data.amount)),
      paidBy: data.paidBy,
      participants: [...data.participants],
      createdAt: Utils.todayIso(),
    };
    trip.expenses.push(expense);
    Storage.saveTrip(trip);
    return { ok: true, expense, trip };
  }

  function updateExpense(tripId, expenseId, data) {
    const errors = validate(data);
    if (errors.length) return { ok: false, errors };

    const trip = Storage.getTrip(tripId);
    const expense = trip.expenses.find((e) => e.id === expenseId);
    if (!expense) return { ok: false, errors: ['هزینه یافت نشد.'] };

    expense.title = data.title.trim();
    expense.amount = Math.round(Utils.parseMoney(data.amount));
    expense.paidBy = data.paidBy;
    expense.participants = [...data.participants];
    Storage.saveTrip(trip);
    return { ok: true, expense, trip };
  }

  function deleteExpense(tripId, expenseId) {
    const trip = Storage.getTrip(tripId);
    if (!trip) return null;
    trip.expenses = trip.expenses.filter((e) => e.id !== expenseId);
    Storage.saveTrip(trip);
    return trip;
  }

  function getExpense(tripId, expenseId) {
    const trip = Storage.getTrip(tripId);
    return trip ? trip.expenses.find((e) => e.id === expenseId) : null;
  }

  return { validate, addExpense, updateExpense, deleteExpense, getExpense };
})();
