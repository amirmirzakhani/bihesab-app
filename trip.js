// trip.js — ایجاد سفر و مدیریت اعضا

const Trip = (() => {
  function createTrip(name, memberCount) {
    const trip = {
      id: Utils.generateId('trip'),
      name: name.trim(),
      memberCount: Number(memberCount),
      members: [],
      expenses: [],
      settledPayments: [], // تراکنش‌های تسویه‌ای که کاربر ثبت کرده
      createdAt: Utils.todayIso(),
    };
    Storage.saveTrip(trip);
    Storage.setActiveTripId(trip.id);
    return trip;
  }

  function getActiveTrip() {
    const id = Storage.getActiveTripId();
    if (!id) return null;
    return Storage.getTrip(id);
  }

  function setMembers(tripId, names) {
    const trip = Storage.getTrip(tripId);
    if (!trip) return null;
    trip.members = names
      .filter((n) => n && n.trim())
      .map((n) => ({ id: Utils.generateId('member'), name: n.trim() }));
    Storage.saveTrip(trip);
    return trip;
  }

  function addMember(tripId, name) {
    const trip = Storage.getTrip(tripId);
    if (!trip || !name.trim()) return trip;
    trip.members.push({ id: Utils.generateId('member'), name: name.trim() });
    Storage.saveTrip(trip);
    return trip;
  }

  function renameMember(tripId, memberId, newName) {
    const trip = Storage.getTrip(tripId);
    if (!trip || !newName.trim()) return trip;
    const member = trip.members.find((m) => m.id === memberId);
    if (member) member.name = newName.trim();
    Storage.saveTrip(trip);
    return trip;
  }

  /** آیا این عضو در هیچ هزینه‌ای (به عنوان پرداخت‌کننده یا استفاده‌کننده) سابقه دارد؟ */
  function memberHasHistory(trip, memberId) {
    return trip.expenses.some(
      (e) => e.paidBy === memberId || e.participants.includes(memberId)
    );
  }

  /** حذف عضو. اگر force=false و عضو سابقه مالی داشته باشد، حذف انجام نمی‌شود و پرچم needsConfirmation برمی‌گردد */
  function removeMember(tripId, memberId, force = false) {
    const trip = Storage.getTrip(tripId);
    if (!trip) return { trip: null, needsConfirmation: false };
    if (!force && memberHasHistory(trip, memberId)) {
      return { trip, needsConfirmation: true };
    }
    trip.members = trip.members.filter((m) => m.id !== memberId);
    // در صورت حذف اجباری، ارجاعات این عضو در هزینه‌های قبلی نیز باید پاک شوند
    trip.expenses.forEach((e) => {
      if (e.paidBy === memberId) e.paidBy = null;
      e.participants = e.participants.filter((id) => id !== memberId);
    });
    Storage.saveTrip(trip);
    return { trip, needsConfirmation: false };
  }

  /** صفر کردن حساب فقط همین سفر: هزینه‌ها و پرداخت‌های تسویه پاک می‌شوند، اعضا می‌مانند. سفرهای دیگر دست‌نخورده‌اند. */
  function resetTrip(tripId) {
    const trip = Storage.getTrip(tripId);
    if (!trip) return null;
    trip.expenses = [];
    trip.settledPayments = [];
    Storage.saveTrip(trip);
    return trip;
  }

  function deleteTrip(tripId) {
    Storage.deleteTrip(tripId);
  }

  function getAllTrips() {
    return Storage.getAllTrips();
  }

  function switchTo(tripId) {
    Storage.setActiveTripId(tripId);
  }

  return {
    createTrip,
    getActiveTrip,
    setMembers,
    addMember,
    renameMember,
    removeMember,
    memberHasHistory,
    resetTrip,
    deleteTrip,
    getAllTrips,
    switchTo,
  };
})();
