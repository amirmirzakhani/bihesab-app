// storage.js — لایه ذخیره‌سازی. تمام تعامل با LocalStorage اینجا متمرکز است
// تا در آینده بتوان آن را با Firebase/Supabase جایگزین کرد بدون تغییر بقیه برنامه.

const Storage = (() => {
  const KEY_TRIPS = 'dong.trips.v1';
  const KEY_ACTIVE_TRIP = 'dong.activeTripId.v1';

  // بعضی مرورگرها هنگام باز کردن فایل مستقیم (file://) دسترسی به localStorage را
  // مسدود می‌کنند (opaque origin). در آن صورت از یک حافظه موقت در RAM استفاده می‌کنیم
  // تا برنامه حداقل در همان جلسه کار کند، به‌جای اینکه با خطا کاملاً از کار بیفتد.
  let _memoryFallback = {};
  let _storageAvailable = true;

  (function detectStorage() {
    try {
      const testKey = '__dong_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (e) {
      _storageAvailable = false;
      console.warn(
        'localStorage در دسترس نیست (احتمالاً به دلیل باز کردن فایل به‌صورت مستقیم). ' +
          'از حافظه موقت استفاده می‌شود؛ اطلاعات با رفرش صفحه از بین می‌رود. ' +
          'برای ذخیره دائمی، فایل‌ها را از طریق یک سرور محلی اجرا کنید.'
      );
    }
  })();

  function _safeGet(key) {
    if (!_storageAvailable) return _memoryFallback[key] ?? null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return _memoryFallback[key] ?? null;
    }
  }

  function _safeSet(key, value) {
    if (!_storageAvailable) {
      _memoryFallback[key] = value;
      return true;
    }
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      _memoryFallback[key] = value;
      return true;
    }
  }

  function _safeRemove(key) {
    if (!_storageAvailable) {
      delete _memoryFallback[key];
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete _memoryFallback[key];
    }
  }

  function isPersistent() {
    return _storageAvailable;
  }

  function _readAll() {
    try {
      const raw = _safeGet(KEY_TRIPS);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      console.error('خطا در خواندن اطلاعات ذخیره‌شده', e);
      return {};
    }
  }

  function _writeAll(tripsById) {
    try {
      _safeSet(KEY_TRIPS, JSON.stringify(tripsById));
      return true;
    } catch (e) {
      console.error('خطا در ذخیره‌سازی اطلاعات', e);
      return false;
    }
  }

  function getAllTrips() {
    const all = _readAll();
    return Object.values(all).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function getTrip(tripId) {
    const all = _readAll();
    return all[tripId] || null;
  }

  function saveTrip(trip) {
    const all = _readAll();
    all[trip.id] = trip;
    return _writeAll(all);
  }

  function deleteTrip(tripId) {
    const all = _readAll();
    delete all[tripId];
    _writeAll(all);
    if (getActiveTripId() === tripId) setActiveTripId(null);
  }

  function getActiveTripId() {
    return _safeGet(KEY_ACTIVE_TRIP);
  }

  function setActiveTripId(tripId) {
    if (tripId) _safeSet(KEY_ACTIVE_TRIP, tripId);
    else _safeRemove(KEY_ACTIVE_TRIP);
  }

  return {
    getAllTrips,
    getTrip,
    saveTrip,
    deleteTrip,
    getActiveTripId,
    setActiveTripId,
    isPersistent,
  };
})();
