// calculator.js — محاسبات مالی مستقل از UI
// اصل مهم: هر هزینه فقط بین استفاده‌کنندگان واقعی آن تقسیم می‌شود، نه همه اعضا.

const Calculator = (() => {
  function calculateTotalExpenses(trip) {
    return trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  /** مجموع مبلغی که هر عضو واقعاً پرداخت کرده است (Map: memberId -> amount) */
  function calculateMemberPaidAmount(trip) {
    const paid = new Map(trip.members.map((m) => [m.id, 0]));
    trip.expenses.forEach((e) => {
      if (paid.has(e.paidBy)) paid.set(e.paidBy, paid.get(e.paidBy) + e.amount);
    });
    return paid;
  }

  /** مجموع سهم واقعی هر عضو از تمام هزینه‌هایی که در آن‌ها شرکت داشته (Map: memberId -> amount) */
  function calculateMemberShare(trip) {
    const share = new Map(trip.members.map((m) => [m.id, 0]));
    trip.expenses.forEach((e) => {
      const validParticipants = e.participants.filter((id) => share.has(id));
      if (validParticipants.length === 0) return;
      const shares = Utils.splitAmountEvenly(e.amount, validParticipants);
      shares.forEach((amount, memberId) => {
        share.set(memberId, share.get(memberId) + amount);
      });
    });
    return share;
  }

  /** Net Balance = مجموع پرداختی - مجموع سهم، برای هر عضو */
  function calculateMemberBalance(trip) {
    const paid = calculateMemberPaidAmount(trip);
    const share = calculateMemberShare(trip);
    const balance = new Map();
    trip.members.forEach((m) => {
      balance.set(m.id, (paid.get(m.id) || 0) - (share.get(m.id) || 0));
    });
    return balance;
  }

  /** خلاصه کامل وضعیت مالی هر عضو، آماده برای نمایش در UI */
  function calculateAllBalances(trip) {
    const paid = calculateMemberPaidAmount(trip);
    const share = calculateMemberShare(trip);
    const balance = calculateMemberBalance(trip);
    return trip.members.map((m) => ({
      id: m.id,
      name: m.name,
      paid: paid.get(m.id) || 0,
      share: share.get(m.id) || 0,
      balance: balance.get(m.id) || 0,
    }));
  }

  return {
    calculateTotalExpenses,
    calculateMemberPaidAmount,
    calculateMemberShare,
    calculateMemberBalance,
    calculateAllBalances,
  };
})();
