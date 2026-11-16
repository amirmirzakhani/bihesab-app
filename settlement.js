// settlement.js — الگوریتم تسویه با کمترین تعداد تراکنش
// نکته مهم: ابتدا Net Balance نهایی هر شخص (از مجموع تمام هزینه‌ها) محاسبه می‌شود،
// سپس پرداخت‌های تسویه‌ای که کاربر قبلاً ثبت کرده به عنوان تعدیل روی همان بالانس اعمال می‌شود،
// و در نهایت الگوریتم حداقل‌تراکنش روی بالانس تعدیل‌شده اجرا می‌گردد.

const Settlement = (() => {
  const EPSILON = 1; // کمتر از ۱ تومان را صفر در نظر می‌گیریم (خطای رند شدن)

  /** بالانس خام هر عضو را با پرداخت‌های تسویه‌ای که قبلاً ثبت شده تعدیل می‌کند */
  function getAdjustedBalances(trip) {
    const rawBalances = Calculator.calculateMemberBalance(trip);
    const adjusted = new Map(rawBalances);

    (trip.settledPayments || []).forEach((p) => {
      // شخص «from» این مبلغ را پرداخت کرده => بدهی‌اش کم می‌شود (بالانس بالا می‌رود)
      if (adjusted.has(p.from)) adjusted.set(p.from, adjusted.get(p.from) + p.amount);
      // شخص «to» این مبلغ را دریافت کرده => طلبش کم می‌شود (بالانس پایین می‌رود)
      if (adjusted.has(p.to)) adjusted.set(p.to, adjusted.get(p.to) - p.amount);
    });

    return adjusted;
  }

  function getDebtors(balances, members) {
    return members
      .map((m) => ({ id: m.id, name: m.name, amount: balances.get(m.id) || 0 }))
      .filter((m) => m.amount < -EPSILON)
      .map((m) => ({ ...m, amount: -m.amount })) // مقدار بدهی به صورت مثبت
      .sort((a, b) => b.amount - a.amount);
  }

  function getCreditors(balances, members) {
    return members
      .map((m) => ({ id: m.id, name: m.name, amount: balances.get(m.id) || 0 }))
      .filter((m) => m.amount > EPSILON)
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * الگوریتم حریصانه (greedy): در هر مرحله بزرگ‌ترین بدهکار و بزرگ‌ترین طلبکار را جفت می‌کند
   * تا حداقل تعداد تراکنش لازم برای صفر شدن همه حساب‌ها به دست آید.
   */
  function calculateSettlementTransactions(trip) {
    const balances = getAdjustedBalances(trip);
    const debtors = getDebtors(balances, trip.members);
    const creditors = getCreditors(balances, trip.members);

    const transactions = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > EPSILON) {
        transactions.push({
          id: Utils.generateId('txn'),
          fromId: debtor.id,
          fromName: debtor.name,
          toId: creditor.id,
          toName: creditor.name,
          amount: Math.round(amount),
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount <= EPSILON) i++;
      if (creditor.amount <= EPSILON) j++;
    }

    return transactions;
  }

  function markTransactionPaid(tripId, transaction) {
    const trip = Storage.getTrip(tripId);
    if (!trip) return null;
    if (!trip.settledPayments) trip.settledPayments = [];
    trip.settledPayments.push({
      id: Utils.generateId('paid'),
      from: transaction.fromId,
      to: transaction.toId,
      fromName: transaction.fromName,
      toName: transaction.toName,
      amount: transaction.amount,
      at: Utils.todayIso(),
    });
    Storage.saveTrip(trip);
    return trip;
  }

  function unmarkPayment(tripId, paymentId) {
    const trip = Storage.getTrip(tripId);
    if (!trip) return null;
    trip.settledPayments = (trip.settledPayments || []).filter((p) => p.id !== paymentId);
    Storage.saveTrip(trip);
    return trip;
  }

  return {
    getAdjustedBalances,
    getDebtors,
    getCreditors,
    calculateSettlementTransactions,
    markTransactionPaid,
    unmarkPayment,
  };
})();
