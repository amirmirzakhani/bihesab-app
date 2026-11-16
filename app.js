// app.js — نقطه شروع برنامه: مسیریابی ساده (Router) و اتصال رویدادها به UI

(function () {
  const state = { route: 'trips', trip: null };

  function loadTrip(tripId) {
    state.trip = Storage.getTrip(tripId);
    return state.trip;
  }

  function refreshCurrentTrip() {
    if (state.trip) loadTrip(state.trip.id);
  }

  function goTo(route, opts = {}) {
    state.route = route;
    if (opts.tripId) loadTrip(opts.tripId);
    UI.render(state);
  }

  // ---------------------------------------------------------------
  // Bootstrap: تصمیم می‌گیرد کاربر باید در کدام صفحه شروع کند
  // ---------------------------------------------------------------
  function bootstrap() {
    if (!Storage.isPersistent()) {
      setTimeout(
        () => UI.showToast('توجه: چون فایل مستقیم باز شده، اطلاعات با رفرش صفحه ذخیره نمی‌ماند.'),
        400
      );
    }
    const activeId = Storage.getActiveTripId();
    const activeTrip = activeId ? Storage.getTrip(activeId) : null;

    if (activeTrip && activeTrip.members.length > 0) {
      state.trip = activeTrip;
      state.route = 'home';
    } else if (activeTrip && activeTrip.members.length === 0) {
      state.trip = activeTrip;
      state.route = 'new-members';
    } else {
      const allTrips = Trip.getAllTrips();
      state.route = allTrips.length ? 'trips' : 'welcome';
    }
    UI.render(state);
  }

  // ---------------------------------------------------------------
  // Helpers for expense form submission
  // ---------------------------------------------------------------
  function collectExpenseFormData(form) {
    const title = form.querySelector('#expense-title').value;
    const amount = form.querySelector('#expense-amount').value;
    const paidBy = form.querySelector('#expense-paidby').value;
    const participants = Array.from(form.querySelectorAll('.checkbox-row input[type="checkbox"]:checked')).map(
      (el) => el.value
    );
    return { title, amount, paidBy, participants };
  }

  function handleSaveExpense(form) {
    const expenseId = form.getAttribute('data-expense-id');
    const data = collectExpenseFormData(form);
    const result = expenseId
      ? Expenses.updateExpense(state.trip.id, expenseId, data)
      : Expenses.addExpense(state.trip.id, data);

    if (!result.ok) {
      UI.renderExpenseFormErrors(result.errors);
      return;
    }
    refreshCurrentTrip();
    UI.closeSheet();
    UI.render(state);
    UI.showToast(expenseId ? 'هزینه ویرایش شد.' : 'هزینه با موفقیت ثبت شد.');
  }

  function handleDeleteExpense(expenseId) {
    UI.showConfirm({
      title: 'حذف هزینه',
      text: 'آیا از حذف این هزینه مطمئن هستید؟ این عملیات قابل بازگشت نیست.',
      confirmText: 'حذف کن',
      danger: true,
      onConfirm: () => {
        Expenses.deleteExpense(state.trip.id, expenseId);
        refreshCurrentTrip();
        UI.closeSheet();
        UI.render(state);
        UI.showToast('هزینه حذف شد.');
      },
    });
  }

  // ---------------------------------------------------------------
  // Members handlers
  // ---------------------------------------------------------------
  function handleRemoveMember(memberId) {
    const firstAttempt = Trip.removeMember(state.trip.id, memberId, false);
    if (firstAttempt.needsConfirmation) {
      const member = state.trip.members.find((m) => m.id === memberId);
      UI.showConfirm({
        title: 'حذف عضو دارای سابقه مالی',
        text: `${member ? member.name : 'این شخص'} در هزینه‌های ثبت‌شده سابقه دارد. حذف این عضو ممکن است محاسبات را تغییر دهد. آیا مطمئن هستید؟`,
        confirmText: 'حذف کن',
        danger: true,
        onConfirm: () => {
          Trip.removeMember(state.trip.id, memberId, true);
          refreshCurrentTrip();
          UI.render(state);
          UI.showToast('عضو حذف شد.');
        },
      });
    } else {
      refreshCurrentTrip();
      UI.render(state);
      UI.showToast('عضو حذف شد.');
    }
  }

  // ---------------------------------------------------------------
  // Reset current trip
  // ---------------------------------------------------------------
  function handleResetTrip() {
    const tripId = state.trip.id;
    UI.showConfirm({
      title: 'صفر کردن حساب‌های این سفر',
      text: `همه هزینه‌ها و پرداخت‌های ثبت‌شده در «${state.trip.name}» پاک می‌شود و حساب از اول شروع می‌شود. اعضای سفر باقی می‌مانند و سفرهای دیگر هیچ تغییری نمی‌کنند. این عملیات قابل بازگشت نیست.`,
      confirmText: 'صفر کن',
      danger: true,
      onConfirm: () => {
        Trip.resetTrip(tripId);
        refreshCurrentTrip();
        state.route = 'home';
        UI.render(state);
        UI.showToast('حساب‌های این سفر صفر شد.');
      },
    });
  }

  // ---------------------------------------------------------------
  // Global click delegation
  // ---------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const overlay = e.target.closest('.sheet-overlay');
    if (overlay && e.target === overlay) {
      UI.closeSheet();
      return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.getAttribute('data-action');
    const id = actionEl.getAttribute('data-id');

    switch (action) {
      case 'navigate':
        goTo(actionEl.getAttribute('data-route'));
        break;

      case 'select-trip': {
        Trip.switchTo(id);
        const trip = loadTrip(id);
        goTo(trip.members.length > 0 ? 'home' : 'new-members');
        break;
      }

      case 'close-sheet':
        UI.closeSheet();
        break;

      case 'run-confirm':
        UI.runPendingConfirm();
        break;

      case 'open-add-expense':
        UI.openSheet(UI.renderExpenseForm(state.trip));
        break;

      case 'open-edit-expense': {
        const expense = Expenses.getExpense(state.trip.id, id);
        UI.openSheet(UI.renderExpenseForm(state.trip, expense));
        break;
      }

      case 'delete-expense':
        handleDeleteExpense(id);
        break;

      case 'rename-member': {
        const member = state.trip.members.find((m) => m.id === id);
        if (member) UI.renderRenameMemberSheet(member);
        break;
      }

      case 'remove-member':
        handleRemoveMember(id);
        break;

      case 'reset-trip':
        handleResetTrip();
        break;

      case 'mark-paid': {
        const txn = UI.getLastSettlementTxn(id);
        if (txn) {
          Settlement.markTransactionPaid(state.trip.id, txn);
          refreshCurrentTrip();
          UI.render(state);
          UI.showToast('پرداخت ثبت شد.');
        }
        break;
      }

      case 'unmark-paid':
        Settlement.unmarkPayment(state.trip.id, id);
        refreshCurrentTrip();
        UI.render(state);
        UI.showToast('ثبت پرداخت لغو شد.');
        break;

      default:
        break;
    }
  });

  // ---------------------------------------------------------------
  // Global submit delegation
  // ---------------------------------------------------------------
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    const formType = form.getAttribute('data-form');

    switch (formType) {
      case 'create-trip': {
        const name = form.querySelector('[name="name"]').value.trim();
        const count = form.querySelector('[name="count"]').value;
        if (!name || !count || Number(count) < 1) {
          UI.showToast('لطفاً نام سفر و تعداد نفرات را صحیح وارد کنید.');
          return;
        }
        const trip = Trip.createTrip(name, count);
        goTo('new-members', { tripId: trip.id });
        break;
      }

      case 'setup-members': {
        const names = Array.from(form.querySelectorAll('.member-name-input')).map((el) => el.value);
        if (names.some((n) => !n.trim())) {
          UI.showToast('لطفاً نام تمام اعضا را وارد کنید.');
          return;
        }
        Trip.setMembers(state.trip.id, names);
        refreshCurrentTrip();
        goTo('home');
        UI.showToast('اعضای سفر ثبت شدند.');
        break;
      }

      case 'save-expense':
        handleSaveExpense(form);
        break;

      case 'add-member': {
        const nameInput = form.querySelector('[name="name"]');
        const name = nameInput.value.trim();
        if (!name) return;
        Trip.addMember(state.trip.id, name);
        refreshCurrentTrip();
        UI.render(state);
        UI.showToast('عضو جدید اضافه شد.');
        break;
      }

      case 'rename-member': {
        const memberId = form.getAttribute('data-id');
        const name = form.querySelector('[name="name"]').value.trim();
        if (!name) return;
        Trip.renameMember(state.trip.id, memberId, name);
        refreshCurrentTrip();
        UI.closeSheet();
        UI.render(state);
        UI.showToast('نام عضو ویرایش شد.');
        break;
      }

      default:
        break;
    }
  });

  // ---------------------------------------------------------------
  // Live per-participant share preview + amount formatting inside the expense sheet
  // ---------------------------------------------------------------
  document.addEventListener('input', (e) => {
    if (e.target.id === 'expense-amount' || e.target.matches('.checkbox-row input[type="checkbox"]')) {
      // (فعلاً پیش‌نمایش زنده ساده نگه داشته شده؛ اعتبارسنجی کامل هنگام ثبت انجام می‌شود)
    }
  });

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
