// ui.js — رندر تمام صفحات و کامپوننت‌های رابط کاربری
// این فایل فقط مسئول ساخت HTML و نمایش است؛ منطق مالی در calculator.js و settlement.js است.

const UI = (() => {
  const root = () => document.getElementById('app-root');
  const fmt = Utils.formatMoney;

  // نگهداری موقت تراکنش‌های تسویه محاسبه‌شده در آخرین رندر، برای دسترسی سریع توسط app.js
  let _lastSettlementTxns = [];
  let _pendingConfirmAction = null;

  function esc(s) {
    return Utils.escapeHtml(s);
  }

  function initial(name) {
    return (name || '؟').trim().charAt(0);
  }

  // ---------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------
  function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.getElementById('app-shell').appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  // ---------------------------------------------------------------
  // Sheet (Bottom Modal) infrastructure
  // ---------------------------------------------------------------
  function closeSheet() {
    const overlay = document.querySelector('.sheet-overlay');
    if (overlay) overlay.remove();
  }

  function openSheet(innerHtml) {
    closeSheet();
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.setAttribute('data-action', 'overlay-close');
    overlay.innerHTML = `<div class="sheet" data-stop>${innerHtml}</div>`;
    document.getElementById('app-shell').appendChild(overlay);
  }

  function showConfirm({ title, text, confirmText = 'تأیید', cancelText = 'انصراف', danger = false, onConfirm }) {
    _pendingConfirmAction = onConfirm;
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h3 class="sheet-title">${esc(title)}</h3>
      </div>
      <p style="color:var(--color-ink-soft); font-size:14.5px; line-height:1.8; margin-bottom:24px;">${esc(text)}</p>
      <div class="sheet-actions">
        <button class="btn btn-secondary" data-action="close-sheet">${esc(cancelText)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="run-confirm">${esc(confirmText)}</button>
      </div>
    `);
  }

  function runPendingConfirm() {
    const fn = _pendingConfirmAction;
    _pendingConfirmAction = null;
    closeSheet();
    if (typeof fn === 'function') fn();
  }

  // ---------------------------------------------------------------
  // Bottom Navigation
  // ---------------------------------------------------------------
  function renderBottomNav(activeRoute) {
    const items = [
      { route: 'home', icon: 'receipt', label: 'هزینه‌ها' },
      { route: 'balances', icon: 'chart', label: 'حساب‌ها' },
      { route: 'settlement', icon: 'check-circle', label: 'تسویه' },
      { route: 'members', icon: 'users', label: 'اعضا' },
      { route: 'trips', icon: 'luggage', label: 'سفرها' },
    ];
    return `
      <nav class="bottom-nav">
        ${items
          .map(
            (it) => `
          <button class="nav-item ${activeRoute === it.route ? 'active' : ''}" data-action="navigate" data-route="${it.route}">
            <span class="nav-icon">${Icons.svg(it.icon, 22)}</span>
            <span>${it.label}</span>
          </button>`
          )
          .join('')}
      </nav>
    `;
  }

  // ---------------------------------------------------------------
  // Shared header used across home / balances / settlement / members
  // ---------------------------------------------------------------
  function renderHeader(trip, view) {
    const total = Calculator.calculateTotalExpenses(trip);
    const balances = Calculator.calculateAllBalances(trip);
    const netPositive = balances.filter((b) => b.balance > 0).length;

    let heroLabel = 'مجموع هزینه‌های سفر';
    let heroValue = fmt(total);

    if (view === 'settlement') {
      const txns = Settlement.calculateSettlementTransactions(trip);
      heroLabel = 'تعداد تراکنش‌های لازم برای تسویه';
      heroValue = `${txns.length} تراکنش`;
    } else if (view === 'balances') {
      heroLabel = 'نفراتی که طلبکارند';
      heroValue = `${netPositive} از ${trip.members.length} نفر`;
    }

    return `
      <header class="app-header">
        <div class="app-header-top">
          <div class="app-header-tripname">
            <span class="app-header-tripname-text">${esc(trip.name)}</span>
          </div>
          <button class="app-header-switch" data-action="navigate" data-route="trips">${Icons.svg('swap', 18)}<span>تعویض سفر</span></button>
        </div>
        <div class="app-header-divider" aria-hidden="true"><i></i></div>
        <div class="app-header-hero-label">${heroLabel}</div>
        <div class="app-header-hero-value">${heroValue}</div>
        <div class="app-header-meta">
          <div class="app-header-meta-item">تعداد افراد <b>${trip.members.length} نفر</b></div>
          <div class="app-header-meta-item">تعداد هزینه‌ها <b>${trip.expenses.length} مورد</b></div>
        </div>
      </header>
    `;
  }

  // ---------------------------------------------------------------
  // Route: Trip Picker
  // ---------------------------------------------------------------
  function renderTripPicker(activeTripId) {
    const trips = Trip.getAllTrips();
    const list = trips.length
      ? trips
          .map(
            (t) => `
        <div class="trip-picker-card ${t.id === activeTripId ? 'is-active' : ''}" data-action="select-trip" data-id="${t.id}">
          <div>
            <div class="trip-picker-name">${esc(t.name)} ${t.id === activeTripId ? '<span class="trip-picker-current">(سفر فعلی)</span>' : ''}</div>
            <div class="trip-picker-meta">${t.members.length} نفر · ${fmt(Calculator.calculateTotalExpenses(t))}</div>
          </div>
          <span class="trip-picker-chevron">${Icons.svg('chevron-left', 20)}</span>
        </div>`
          )
          .join('')
      : `<div class="empty-state">
           <div class="empty-state-icon">${Icons.svg('luggage', 34)}</div>
           <div class="empty-state-title">هنوز سفری نساخته‌اید</div>
           <div class="empty-state-text">برای شروع، اولین سفر گروهی خود را ایجاد کنید.</div>
         </div>`;

    const backLink = activeTripId
      ? `<button class="btn-back" data-action="navigate" data-route="home">${Icons.svg('arrow-right', 20)}<span>بازگشت</span></button>`
      : '';

    return `
      <div class="flow-screen" style="justify-content:flex-start; padding-top:56px;">
        ${backLink}
        <div class="flow-header">
          <div class="flow-eyebrow">بی‌حساب</div>
          <h1 class="flow-title">سفرهای شما</h1>
          <p class="flow-subtitle">یکی از سفرها را انتخاب کنید یا یک سفر جدید بسازید.</p>
        </div>
        <div style="margin-bottom:20px;">${list}</div>
        <button class="btn btn-primary" data-action="navigate" data-route="new-trip">${Icons.svg('plus', 20)}<span>ساخت سفر جدید</span></button>
      </div>
    `;
  }

  function renderWelcome() {
    return `
      <div class="welcome-screen">
        <div class="welcome-top">
          <div class="welcome-eyebrow">مدیریت هزینه‌های سفر گروهی</div>
          <h1 class="welcome-title">بی‌حساب</h1>
          <p class="welcome-subtitle">هزینه‌های سفرت را ثبت کن، بگذار بی‌حساب حساب‌ها را برایت صاف کند.</p>
          <button class="welcome-cta" data-action="navigate" data-route="new-trip">${Icons.svg('plus', 20)}<span>ساخت سفر جدید</span></button>
        </div>
        <div class="welcome-photo" style="background-image:url('assets/hero.jpg');"></div>
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // Route: New Trip
  // ---------------------------------------------------------------
  function renderNewTrip() {
    return `
      <div class="flow-screen">
        <div class="flow-header">
          <div class="flow-eyebrow">بی‌حساب</div>
          <h1 class="flow-title">سفر جدید بسازید</h1>
          <p class="flow-subtitle">نام سفر و تعداد نفرات را وارد کنید تا شروع کنیم.</p>
        </div>
        <form data-form="create-trip">
          <div class="field">
            <label for="trip-name">نام سفر</label>
            <input type="text" id="trip-name" name="name" placeholder="مثلاً سفر شمال" required autocomplete="off" />
          </div>
          <div class="field">
            <label for="trip-count">تعداد نفرات</label>
            <input type="number" id="trip-count" name="count" placeholder="مثلاً 4" min="1" max="30" required inputmode="numeric" />
          </div>
          <button type="submit" class="btn btn-primary">ادامه</button>
        </form>
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // Route: New Members
  // ---------------------------------------------------------------
  function renderNewMembers(trip) {
    const rows = Array.from({ length: trip.memberCount })
      .map(
        (_, i) => `
        <div class="member-input-row">
          <div class="member-index">${i + 1}</div>
          <input type="text" class="member-name-input" placeholder="نام نفر ${i + 1}" required autocomplete="off" style="flex:1; padding:13px 14px; border:1.5px solid var(--color-border); border-radius:12px;" />
        </div>`
      )
      .join('');

    return `
      <div class="flow-screen">
        <div class="flow-header">
          <div class="flow-eyebrow">${esc(trip.name)}</div>
          <h1 class="flow-title">اعضای سفر را وارد کنید</h1>
          <p class="flow-subtitle">نام ${trip.memberCount} نفری که در این سفر شریک هستند را بنویسید.</p>
        </div>
        <form data-form="setup-members">
          <div class="member-input-list">${rows}</div>
          <button type="submit" class="btn btn-primary">شروع مدیریت هزینه‌ها</button>
        </form>
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // Route: Home (expense list)
  // ---------------------------------------------------------------
  const KEYWORD_ICONS = [
    { keywords: ['رستوران', 'غذا', 'ناهار', 'شام', 'فست‌ فود', 'کباب', 'پیتزا', 'صبحانه'], icon: 'utensils' },
    { keywords: ['بنزین', 'سوخت', 'پمپ‌بنزین', 'گازوئیل'], icon: 'fuel' },
    { keywords: ['هتل', 'اقامت', 'ویلا', 'مسافرخانه', 'خانه'], icon: 'bed' },
    { keywords: ['تاکسی', 'اسنپ', 'تپسی', 'کرایه', 'پارکینگ'], icon: 'car' },
    { keywords: ['بلیط', 'ورودی', 'موزه', 'پارک'], icon: 'ticket' },
    { keywords: ['خرید', 'سوپرمارکت', 'بازار', 'تنقلات', 'آب'], icon: 'cart' },
    { keywords: ['کافه', 'قهوه', 'چای'], icon: 'coffee' },
    { keywords: ['هدیه', 'کادو', 'سوغات'], icon: 'gift' },
  ];
  function iconFor(expense) {
    const title = expense.title.trim();
    const match = KEYWORD_ICONS.find((k) => k.keywords.some((w) => title.includes(w)));
    return match ? match.icon : 'receipt';
  }

  function memberName(trip, id) {
    const m = trip.members.find((x) => x.id === id);
    return m ? m.name : 'حذف‌شده';
  }

  function renderHome(trip) {
    const expenses = [...trip.expenses].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const list = expenses.length
      ? `<div class="expense-list">
          ${expenses
            .map(
              (e) => `
            <div class="expense-card" data-action="open-edit-expense" data-id="${e.id}">
              <div class="expense-icon">${Icons.svg(iconFor(e), 22)}</div>
              <div class="expense-body">
                <div class="expense-title">${esc(e.title)}</div>
                <div class="expense-meta">پرداخت توسط ${esc(memberName(trip, e.paidBy))} · ${e.participants.length} نفر · ${Utils.formatDate(e.createdAt)}</div>
              </div>
              <div class="expense-amount">${fmt(e.amount)}</div>
            </div>`
            )
            .join('')}
        </div>`
      : `<div class="empty-state">
          <div class="empty-state-icon">${Icons.svg('receipt', 34)}</div>
          <div class="empty-state-title">هنوز هزینه‌ای ثبت نشده است</div>
          <div class="empty-state-text">اولین هزینه سفر را ثبت کنید تا محاسبات شروع شود.</div>
          <button class="btn btn-primary" data-action="open-add-expense">افزودن اولین هزینه</button>
        </div>`;

    return `
      ${renderHeader(trip, 'home')}
      <div class="content">
        <div class="section-title">هزینه‌های ثبت‌شده</div>
        ${list}
      </div>
      ${trip.expenses.length ? `<button class="fab" data-action="open-add-expense" aria-label="افزودن هزینه">${Icons.svg('plus', 26)}</button>` : ''}
    `;
  }

  // ---------------------------------------------------------------
  // Expense Form Sheet (add / edit)
  // ---------------------------------------------------------------
  function renderExpenseForm(trip, expense = null) {
    const isEdit = !!expense;
    const selectedParticipants = new Set(expense ? expense.participants : trip.members.map((m) => m.id));
    const paidBy = expense ? expense.paidBy : '';

    const payerOptions = trip.members
      .map((m) => `<option value="${m.id}" ${m.id === paidBy ? 'selected' : ''}>${esc(m.name)}</option>`)
      .join('');

    const participantRows = trip.members
      .map(
        (m) => `
        <div class="checkbox-row">
          <input type="checkbox" id="participant-${m.id}" value="${m.id}" ${selectedParticipants.has(m.id) ? 'checked' : ''} />
          <label for="participant-${m.id}">${esc(m.name)}</label>
        </div>`
      )
      .join('');

    return `
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h3 class="sheet-title">${isEdit ? 'ویرایش هزینه' : 'افزودن هزینه'}</h3>
        <button class="sheet-close" data-action="close-sheet">${Icons.svg('x', 20)}</button>
      </div>
      <form data-form="save-expense" data-expense-id="${isEdit ? expense.id : ''}">
        <div id="expense-form-errors"></div>
        <div class="field">
          <label for="expense-title">عنوان هزینه</label>
          <input type="text" id="expense-title" name="title" placeholder="مثلاً رستوران" value="${isEdit ? esc(expense.title) : ''}" autocomplete="off" />
        </div>
        <div class="field">
          <label for="expense-amount">مبلغ هزینه (تومان)</label>
          <input type="number" id="expense-amount" name="amount" placeholder="مثلاً 1200000" inputmode="numeric" min="0" value="${isEdit ? expense.amount : ''}" />
        </div>
        <div class="field">
          <label for="expense-paidby">چه کسی این هزینه را پرداخت کرده؟</label>
          <select id="expense-paidby" name="paidBy">
            <option value="" disabled ${paidBy ? '' : 'selected'}>انتخاب کنید</option>
            ${payerOptions}
          </select>
        </div>
        <div class="field">
          <label>چه کسانی از این هزینه استفاده کرده‌اند؟</label>
          <div class="checkbox-list">${participantRows}</div>
        </div>
        <div class="sheet-actions">
          ${isEdit ? '<button type="button" class="btn btn-danger" data-action="delete-expense" data-id="' + expense.id + '">حذف</button>' : ''}
          <button type="submit" class="btn btn-primary">${isEdit ? 'ذخیره تغییرات' : 'ثبت هزینه'}</button>
        </div>
      </form>
    `;
  }

  function renderExpenseFormErrors(errors) {
    const box = document.getElementById('expense-form-errors');
    if (!box) return;
    box.innerHTML = errors.length
      ? `<div class="error-box">${errors.map((e) => esc(e)).join('<br/>')}</div>`
      : '';
  }

  // ---------------------------------------------------------------
  // Route: Balances
  // ---------------------------------------------------------------
  function renderBalances(trip) {
    const balances = Calculator.calculateAllBalances(trip);

    const cards = balances.length
      ? balances
          .map((b) => {
            const isCredit = b.balance > 1;
            const isDebt = b.balance < -1;
            const pillClass = isCredit ? 'pill-credit' : isDebt ? 'pill-debt' : 'pill-even';
            const pillText = isCredit
              ? `باید ${fmt(b.balance)} دریافت کند`
              : isDebt
              ? `باید ${fmt(Math.abs(b.balance))} پرداخت کند`
              : 'حساب تسویه است';
            return `
            <div class="balance-card">
              <div class="balance-card-top">
                <div class="balance-name"><span class="avatar">${esc(initial(b.name))}</span>${esc(b.name)}</div>
                <span class="balance-status-pill ${pillClass}">${pillText}</span>
              </div>
              <div class="balance-rows">
                <div class="balance-row">
                  <div class="balance-row-label">پرداخت کرده</div>
                  <div class="balance-row-value">${fmt(b.paid)}</div>
                </div>
                <div class="balance-row">
                  <div class="balance-row-label">سهم واقعی</div>
                  <div class="balance-row-value">${fmt(b.share)}</div>
                </div>
              </div>
            </div>`;
          })
          .join('')
      : `<div class="empty-state">
          <div class="empty-state-icon">${Icons.svg('chart', 34)}</div>
          <div class="empty-state-title">هنوز عضوی ثبت نشده است</div>
        </div>`;

    return `
      ${renderHeader(trip, 'balances')}
      <div class="content">
        <div class="section-title">وضعیت حساب افراد</div>
        <div class="balance-list">${cards}</div>
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // Route: Settlement
  // ---------------------------------------------------------------
  function renderSettlement(trip) {
    const txns = Settlement.calculateSettlementTransactions(trip);
    _lastSettlementTxns = txns;
    const total = Calculator.calculateTotalExpenses(trip);
    const settled = trip.settledPayments || [];

    const pendingHtml = txns.length
      ? txns
          .map(
            (t) => `
        <div class="settlement-txn">
          <div class="settlement-txn-flow">
            <div class="settlement-txn-names">${esc(t.fromName)} <span class="settlement-txn-arrow">باید بپردازد به</span> ${esc(t.toName)}</div>
            <div class="settlement-txn-amount">${fmt(t.amount)}</div>
          </div>
          <button class="settlement-check-btn" data-action="mark-paid" data-id="${t.id}" aria-label="ثبت پرداخت">${Icons.svg('check', 20)}</button>
        </div>`
          )
          .join('')
      : `<div class="empty-state">
          <div class="empty-state-icon">${Icons.svg('check-circle', 34)}</div>
          <div class="empty-state-title">همه حساب‌ها تسویه است</div>
          <div class="empty-state-text">هیچ تراکنش باقی‌مانده‌ای برای تسویه وجود ندارد.</div>
        </div>`;

    const doneHtml = settled.length
      ? `<div class="section-title" style="margin-top:28px;">پرداخت‌های انجام‌شده</div>
         ${settled
           .map(
             (p) => `
          <div class="settlement-txn is-paid">
            <div class="settlement-txn-flow">
              <div class="settlement-txn-names">${esc(p.fromName)} <span class="settlement-txn-arrow">${Icons.svg('arrow-left', 16)}</span> ${esc(p.toName)}</div>
              <div class="settlement-txn-amount">${fmt(p.amount)}</div>
            </div>
            <button class="settlement-check-btn checked" data-action="unmark-paid" data-id="${p.id}" aria-label="لغو ثبت">${Icons.svg('check', 20)}</button>
          </div>`
           )
           .join('')}`
      : '';

    return `
      ${renderHeader(trip, 'settlement')}
      <div class="content">
        <div class="settlement-summary">
          <div class="settlement-stat">
            <div class="settlement-stat-value">${txns.length}</div>
            <div class="settlement-stat-label">تراکنش لازم</div>
          </div>
          <div class="settlement-stat">
            <div class="settlement-stat-value">${fmt(total, { withSuffix: false })}</div>
            <div class="settlement-stat-label">مجموع هزینه‌های سفر (تومان)</div>
          </div>
        </div>
        <div class="section-title">تسویه نهایی سفر</div>
        <p style="color:var(--color-ink-soft); font-size:13.5px; margin-bottom:16px;">برای تسویه کامل حساب‌ها، تراکنش‌های زیر انجام شود:</p>
        ${pendingHtml}
        ${doneHtml}
        <div class="danger-zone">
          <div class="section-title">شروع دوباره</div>
          <p class="danger-zone-text">همه هزینه‌ها و پرداخت‌های ثبت‌شده در این سفر پاک می‌شود. اعضا و سفرهای دیگر بدون تغییر می‌مانند.</p>
          <button class="btn btn-danger" data-action="reset-trip">${Icons.svg('reset', 20)}<span>صفر کردن حساب‌های این سفر</span></button>
        </div>
      </div>
    `;
  }

  function getLastSettlementTxn(id) {
    return _lastSettlementTxns.find((t) => t.id === id);
  }

  // ---------------------------------------------------------------
  // Route: Members
  // ---------------------------------------------------------------
  function renderMembers(trip) {
    const rows = trip.members
      .map(
        (m) => `
      <div class="member-row">
        <span class="avatar">${esc(initial(m.name))}</span>
        <span class="member-row-name">${esc(m.name)}</span>
        <button class="icon-btn" data-action="rename-member" data-id="${m.id}" aria-label="ویرایش نام">${Icons.svg('pencil', 18)}</button>
        <button class="icon-btn icon-btn-danger" data-action="remove-member" data-id="${m.id}" aria-label="حذف عضو">${Icons.svg('trash', 18)}</button>
      </div>`
      )
      .join('');

    return `
      ${renderHeader(trip, 'members')}
      <div class="content">
        <div class="section-title">اعضای سفر</div>
        ${rows || '<div class="empty-state"><div class="empty-state-title">عضوی وجود ندارد</div></div>'}
        <form data-form="add-member" style="margin-top:20px; display:flex; gap:8px;">
          <input type="text" name="name" placeholder="نام عضو جدید" autocomplete="off" style="flex:1; padding:13px 14px; border:1.5px solid var(--color-border); border-radius:12px;" />
          <button type="submit" class="btn btn-primary" style="width:auto; padding:13px 20px;">افزودن</button>
        </form>
        <div class="app-credit">
          <span class="app-credit-diamond" aria-hidden="true"></span>
          <span>ساخته‌شده توسط امیرحسین میرزاخانی</span>
        </div>
      </div>
    `;
  }

  function renderRenameMemberSheet(member) {
    openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h3 class="sheet-title">ویرایش نام عضو</h3>
        <button class="sheet-close" data-action="close-sheet">${Icons.svg('x', 20)}</button>
      </div>
      <form data-form="rename-member" data-id="${member.id}">
        <div class="field">
          <label for="rename-input">نام جدید</label>
          <input type="text" id="rename-input" name="name" value="${esc(member.name)}" autocomplete="off" />
        </div>
        <button type="submit" class="btn btn-primary">ذخیره</button>
      </form>
    `);
  }

  // ---------------------------------------------------------------
  // Master render
  // ---------------------------------------------------------------
  function render(state) {
    const { route, trip } = state;
    let html = '';

    switch (route) {
      case 'welcome':
        html = renderWelcome();
        break;
      case 'trips':
        html = renderTripPicker(trip ? trip.id : null);
        break;
      case 'new-trip':
        html = renderNewTrip();
        break;
      case 'new-members':
        html = renderNewMembers(trip);
        break;
      case 'home':
        html = renderHome(trip) + renderBottomNav('home');
        break;
      case 'balances':
        html = renderBalances(trip) + renderBottomNav('balances');
        break;
      case 'settlement':
        html = renderSettlement(trip) + renderBottomNav('settlement');
        break;
      case 'members':
        html = renderMembers(trip) + renderBottomNav('members');
        break;
      default:
        html = renderTripPicker();
    }

    root().innerHTML = html;
    window.scrollTo(0, 0);
  }

  return {
    render,
    openSheet,
    closeSheet,
    showConfirm,
    runPendingConfirm,
    showToast,
    renderExpenseForm,
    renderExpenseFormErrors,
    renderRenameMemberSheet,
    getLastSettlementTxn,
  };
})();
