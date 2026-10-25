/**
 * DISCIPLINE OS - Main Application Logic
 * Strict Schedule, Push-up Progression & Penalty System (5,000 UZS/day)
 */

// Storage Keys
const USERS_STORAGE_KEY = 'discipline_os_users_v1';
const CURRENT_USER_KEY = 'discipline_os_current_user_v1';
const PENALTY_AMOUNT_PER_DAY = 5000; // 5 000 сум

// State
let currentUser = null;
let selectedPenaltyDate = new Date(); // Tracks viewing month in penalty tab

// Default strict schedule for newly registered users
const DEFAULT_SCHEDULE_SLOTS = [
  { id: 's1', name: '🌅 Подъем, вода, утренняя зарядка', start: '06:30', end: '07:15', category: 'routine' },
  { id: 's2', name: '💪 Тренировка и норма отжиманий', start: '07:15', end: '08:00', category: 'sport' },
  { id: 's3', name: '🍳 Питательный завтрак и душ', start: '08:00', end: '08:45', category: 'routine' },
  { id: 's4', name: '🎯 Глубокая работа / Учеба (Блок 1)', start: '09:00', end: '13:00', category: 'work' },
  { id: 's5', name: '🥗 Обед и перезагрузка', start: '13:00', end: '14:00', category: 'rest' },
  { id: 's6', name: '💼 Работа, задачи и проекты (Блок 2)', start: '14:00', end: '18:00', category: 'work' },
  { id: 's7', name: '🚶 Прогулка, разгрузка, свежий воздух', start: '18:00', end: '19:00', category: 'rest' },
  { id: 's8', name: '🍽️ Ужин и время с семьей', start: '19:00', end: '20:30', category: 'routine' },
  { id: 's9', name: '📚 Чтение книги и итоги дня', start: '20:30', end: '22:00', category: 'work' },
  { id: 's10', name: '🌙 Подготовка ко сну, без гаджетов', start: '22:30', end: '23:00', category: 'sleep' }
];

// Initialize application on page load
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  checkAuthSession();
  registerServiceWorker();
});

/* =========================================================
   AUTHENTICATION & USER SESSIONS
   ========================================================= */

function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY)) || {};
  } catch (e) {
    console.error('Failed to parse users', e);
    return {};
  }
}

function saveAllUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function checkAuthSession() {
  const currentUsername = localStorage.getItem(CURRENT_USER_KEY);
  const users = getAllUsers();

  if (currentUsername && users[currentUsername]) {
    currentUser = users[currentUsername];
    showMainScreen();
  } else {
    showAuthScreen();
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginError = document.getElementById('loginError');
  const regError = document.getElementById('regError');

  loginError.classList.add('hidden');
  regError.classList.add('hidden');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    tabLoginBtn.classList.remove('active');
    tabRegisterBtn.classList.add('active');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const regError = document.getElementById('regError');

  if (!name || !username || !password) {
    showError(regError, 'Пожалуйста, заполните все поля');
    return;
  }

  if (password.length < 4) {
    showError(regError, 'Пароль должен быть не менее 4 символов');
    return;
  }

  const users = getAllUsers();
  if (users[username]) {
    showError(regError, 'Пользователь с таким логином уже существует');
    return;
  }

  // Create new user profile
  const todayKey = getTodayDateKey();
  const newUser = {
    name: name,
    username: username,
    password: password, // In client storage
    createdAt: new Date().toISOString(),
    pushupTarget: 50,
    streak: 0,
    scheduleSlots: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_SLOTS)),
    pushupLogs: {
      [todayKey]: { target: 50, done: 0, penalty: 0, status: 'pending' }
    },
    scheduleCompletions: {}
  };

  users[username] = newUser;
  saveAllUsers(users);

  // Set active session
  currentUser = newUser;
  localStorage.setItem(CURRENT_USER_KEY, username);

  document.getElementById('registerForm').reset();
  showMainScreen();
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const loginError = document.getElementById('loginError');

  const users = getAllUsers();
  const user = users[username];

  if (!user || user.password !== password) {
    showError(loginError, 'Неверный логин или пароль');
    return;
  }

  currentUser = user;
  localStorage.setItem(CURRENT_USER_KEY, username);

  document.getElementById('loginForm').reset();
  showMainScreen();
}

function handleLogout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  currentUser = null;
  showAuthScreen();
}

/**
 * Permanently delete the user account and wipe their schedule & stats
 */
function confirmDeleteAccount() {
  if (!currentUser) return;

  const confirmed = confirm(
    `ВНИМАНИЕ!\n\nВы действительно хотите навсегда удалить аккаунт @${currentUser.username}?\n\nВсе ваши отжимания, жесткое расписание и история штрафов будут стёрты БЕЗ ВОЗМОЖНОСТИ восстановления!`
  );

  if (!confirmed) return;

  const doubleCheck = prompt('Для подтверждения напишите слово "УДАЛИТЬ":');
  if (doubleCheck && doubleCheck.trim().toUpperCase() === 'УДАЛИТЬ') {
    const users = getAllUsers();
    delete users[currentUser.username];
    saveAllUsers(users);

    localStorage.removeItem(CURRENT_USER_KEY);
    currentUser = null;

    alert('Ваш аккаунт и все данные полностью удалены. Чтобы продолжить, создайте новый аккаунт.');
    showAuthScreen();
  } else {
    alert('Удаление отменено.');
  }
}

function saveCurrentUser() {
  if (!currentUser) return;
  const users = getAllUsers();
  users[currentUser.username] = currentUser;
  saveAllUsers(users);
}

function showError(element, text) {
  element.textContent = text;
  element.classList.remove('hidden');
}

function showAuthScreen() {
  const auth = document.getElementById('authScreen');
  const main = document.getElementById('mainScreen');
  if (auth) {
    auth.classList.add('active');
    auth.classList.remove('hidden');
  }
  if (main) {
    main.classList.remove('active');
    main.classList.add('hidden');
  }
}

function showMainScreen() {
  const auth = document.getElementById('authScreen');
  const main = document.getElementById('mainScreen');
  if (auth) {
    auth.classList.remove('active');
    auth.classList.add('hidden');
  }
  if (main) {
    main.classList.add('active');
    main.classList.remove('hidden');
  }

  auditPastDaysPenalties();
  renderUserProfile();
  renderSchedule();
  renderPushups();
  renderPenalties();
}

/* =========================================================
   DATE & PENALTY LOGIC (5,000 UZS)
   ========================================================= */

function getTodayDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrencyUZS(amount) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' сум';
}

/**
 * Checks all past days in user history. If a day had target > 0 and done < target,
 * mark it as missed with 5000 UZS penalty.
 */
function auditPastDaysPenalties() {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();

  if (!currentUser.pushupLogs) currentUser.pushupLogs = {};
  if (!currentUser.pushupLogs[todayKey]) {
    currentUser.pushupLogs[todayKey] = {
      target: currentUser.pushupTarget || 50,
      done: 0,
      penalty: 0,
      status: 'pending'
    };
  }

  // Calculate streak based on past days
  let streak = 0;
  const sortedDates = Object.keys(currentUser.pushupLogs).sort().reverse();
  
  for (const dateKey of sortedDates) {
    const log = currentUser.pushupLogs[dateKey];
    if (dateKey === todayKey) {
      if (log.done >= log.target) streak++;
      continue;
    }

    // If past day was not completed
    if (log.done < log.target) {
      log.status = 'missed';
      log.penalty = PENALTY_AMOUNT_PER_DAY;
      // Streak breaks at first past missed day
      break;
    } else {
      log.status = 'success';
      log.penalty = 0;
      streak++;
    }
  }

  currentUser.streak = streak;
  saveCurrentUser();
}

/* =========================================================
   NAVIGATION & TABS
   ========================================================= */

function switchView(viewId) {
  const views = ['viewSchedule', 'viewPushups', 'viewPenalties', 'viewProfile'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add('hidden');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.remove('hidden');

  // Bottom tab buttons active state
  const tabs = document.querySelectorAll('.nav-tab-item');
  tabs.forEach(tab => {
    const onclickAttr = tab.getAttribute('onclick') || '';
    if (onclickAttr.includes(viewId)) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Refresh view specific data
  if (viewId === 'viewSchedule') renderSchedule();
  if (viewId === 'viewPushups') renderPushups();
  if (viewId === 'viewPenalties') renderPenalties();
  if (viewId === 'viewProfile') renderUserProfile();
}

/* =========================================================
   CLOCK & HEADER
   ========================================================= */

function initLiveClock() {
  function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('liveClock');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}`;

    const dateOptions = { day: 'numeric', month: 'long', weekday: 'long' };
    const dateStr = now.toLocaleDateString('ru-RU', dateOptions);
    const dateEl = document.getElementById('currentDateStr');
    if (dateEl) dateEl.textContent = dateStr;
  }
  update();
  setInterval(update, 1000);
}

function renderUserProfile() {
  if (!currentUser) return;
  const firstLetter = currentUser.name.charAt(0).toUpperCase();

  document.getElementById('userAvatar').textContent = firstLetter;
  document.getElementById('displayName').textContent = currentUser.name;
  document.getElementById('profileBigAvatar').textContent = firstLetter;
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileUsername').textContent = `@${currentUser.username}`;

  const createdDate = new Date(currentUser.createdAt || Date.now());
  document.getElementById('memberSince').textContent = `В системе с ${createdDate.toLocaleDateString('ru-RU')}`;
}

/* =========================================================
   SCHEDULE TAB LOGIC
   ========================================================= */

function renderSchedule() {
  if (!currentUser) return;
  const listEl = document.getElementById('timelineList');
  if (!listEl) return;

  const slots = currentUser.scheduleSlots || [];
  slots.sort((a, b) => a.start.localeCompare(b.start));

  const todayKey = getTodayDateKey();
  if (!currentUser.scheduleCompletions) currentUser.scheduleCompletions = {};
  const completedSlots = currentUser.scheduleCompletions[todayKey] || [];

  listEl.innerHTML = '';

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let activeBlock = null;

  slots.forEach(slot => {
    const startMins = timeToMinutes(slot.start);
    const endMins = timeToMinutes(slot.end);
    const isNow = currentMinutes >= startMins && currentMinutes < endMins;
    const isCompleted = completedSlots.includes(slot.id);

    if (isNow) activeBlock = slot;

    const itemEl = document.createElement('div');
    itemEl.className = `timeline-item ${isNow ? 'active-now' : ''} ${isCompleted ? 'completed' : ''}`;
    
    itemEl.innerHTML = `
      <div class="timeline-time-col">
        <span class="time-start">${slot.start}</span>
        <span class="time-end">${slot.end}</span>
      </div>
      <div class="cat-indicator cat-${slot.category || 'work'}"></div>
      <div class="timeline-info-col" onclick="openEditSlotModal('${slot.id}')">
        <div class="slot-title">${escapeHtml(slot.name)}</div>
        <div class="slot-category-name">${getCategoryName(slot.category)}</div>
      </div>
      <button class="timeline-check ${isCompleted ? 'checked' : ''}" onclick="toggleSlotCompletion('${slot.id}')">
        ${isCompleted ? '✓' : ''}
      </button>
    `;
    listEl.appendChild(itemEl);
  });

  // Update Hero & Focus Card
  renderFocusCard(activeBlock, completedSlots);

  // Update circular progress
  const totalSlots = slots.length;
  const doneSlots = completedSlots.length;
  const percent = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;

  const circle = document.getElementById('scheduleProgressCircle');
  if (circle) {
    circle.style.setProperty('--progress', percent);
    document.getElementById('scheduleProgressPercent').textContent = `${percent}%`;
  }
}

function renderFocusCard(activeBlock, completedSlots) {
  const card = document.getElementById('currentFocusCard');
  const titleEl = document.getElementById('currentBlockTitle');
  const timeEl = document.getElementById('currentBlockTime');
  const btn = document.getElementById('quickToggleCurrentBtn');

  if (!activeBlock) {
    titleEl.textContent = 'Свободное время / Отдых';
    timeEl.textContent = 'Текущий блок не назначен';
    btn.classList.add('hidden');
    return;
  }

  btn.classList.remove('hidden');
  titleEl.textContent = activeBlock.name;
  timeEl.textContent = `${activeBlock.start} - ${activeBlock.end}`;

  const isDone = completedSlots.includes(activeBlock.id);
  if (isDone) {
    btn.classList.add('done');
    btn.textContent = '✓ Готово';
  } else {
    btn.classList.remove('done');
    btn.textContent = 'Отметить';
  }
}

function toggleCurrentBlock() {
  if (!currentUser) return;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = currentUser.scheduleSlots || [];
  const activeBlock = slots.find(s => {
    const startMins = timeToMinutes(s.start);
    const endMins = timeToMinutes(s.end);
    return currentMinutes >= startMins && currentMinutes < endMins;
  });

  if (activeBlock) {
    toggleSlotCompletion(activeBlock.id);
  }
}

function toggleSlotCompletion(slotId) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.scheduleCompletions) currentUser.scheduleCompletions = {};
  if (!currentUser.scheduleCompletions[todayKey]) currentUser.scheduleCompletions[todayKey] = [];

  const list = currentUser.scheduleCompletions[todayKey];
  const idx = list.indexOf(slotId);

  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(slotId);
    playHapticSound('success');
  }

  saveCurrentUser();
  renderSchedule();
}

function openAddSlotModal() {
  document.getElementById('modalSlotTitle').textContent = 'Новый блок времени';
  document.getElementById('slotId').value = '';
  document.getElementById('slotName').value = '';
  document.getElementById('slotStart').value = '10:00';
  document.getElementById('slotEnd').value = '11:00';
  document.getElementById('slotCategory').value = 'work';
  document.getElementById('deleteSlotBtn').classList.add('hidden');
  document.getElementById('slotModal').classList.remove('hidden');
}

function openEditSlotModal(slotId) {
  if (!currentUser) return;
  const slot = currentUser.scheduleSlots.find(s => s.id === slotId);
  if (!slot) return;

  document.getElementById('modalSlotTitle').textContent = 'Редактировать блок';
  document.getElementById('slotId').value = slot.id;
  document.getElementById('slotName').value = slot.name;
  document.getElementById('slotStart').value = slot.start;
  document.getElementById('slotEnd').value = slot.end;
  document.getElementById('slotCategory').value = slot.category || 'work';
  document.getElementById('deleteSlotBtn').classList.remove('hidden');
  document.getElementById('slotModal').classList.remove('hidden');
}

function closeSlotModal() {
  document.getElementById('slotModal').classList.add('hidden');
}

function saveScheduleSlot(e) {
  e.preventDefault();
  if (!currentUser) return;

  const slotId = document.getElementById('slotId').value;
  const name = document.getElementById('slotName').value.trim();
  const start = document.getElementById('slotStart').value;
  const end = document.getElementById('slotEnd').value;
  const category = document.getElementById('slotCategory').value;

  if (slotId) {
    // Edit existing
    const slot = currentUser.scheduleSlots.find(s => s.id === slotId);
    if (slot) {
      slot.name = name;
      slot.start = start;
      slot.end = end;
      slot.category = category;
    }
  } else {
    // Create new
    currentUser.scheduleSlots.push({
      id: 's_' + Date.now(),
      name,
      start,
      end,
      category
    });
  }

  saveCurrentUser();
  closeSlotModal();
  renderSchedule();
}

function deleteCurrentSlot() {
  const slotId = document.getElementById('slotId').value;
  if (!slotId || !currentUser) return;

  if (confirm('Удалить этот блок из расписания?')) {
    currentUser.scheduleSlots = currentUser.scheduleSlots.filter(s => s.id !== slotId);
    saveCurrentUser();
    closeSlotModal();
    renderSchedule();
  }
}

/* =========================================================
   PUSH-UPS & PENALTY CALCULATION
   ========================================================= */

function renderPushups() {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.pushupLogs) currentUser.pushupLogs = {};

  if (!currentUser.pushupLogs[todayKey]) {
    currentUser.pushupLogs[todayKey] = {
      target: currentUser.pushupTarget || 50,
      done: 0,
      penalty: 0,
      status: 'pending'
    };
  }

  const todayLog = currentUser.pushupLogs[todayKey];
  const target = todayLog.target || currentUser.pushupTarget || 50;
  const done = todayLog.done || 0;

  // Display counters
  document.getElementById('pushupsDone').textContent = done;
  document.getElementById('pushupsTarget').textContent = target;
  document.getElementById('streakCount').textContent = currentUser.streak || 0;

  // Progress Bar
  const percent = Math.min(100, Math.round((done / target) * 100));
  document.getElementById('pushupProgressBar').style.width = `${percent}%`;
  document.getElementById('pushupPercentText').textContent = `${percent}%`;

  const statusText = document.getElementById('pushupStatusText');
  const verdictBox = document.getElementById('dayVerdictBox');
  const penaltyStat = document.getElementById('todayPenaltyStatus');

  if (done >= target) {
    statusText.textContent = '🔥 Цель дня выполнена!';
    statusText.style.color = 'var(--accent-green)';
    penaltyStat.textContent = '0 сум';
    penaltyStat.style.color = 'var(--accent-green)';

    verdictBox.className = 'day-verdict-box verdict-success';
    verdictBox.innerHTML = `
      <div>🎯 ЦЕЛЬ ДОСТИГНУТА! Красавчик!</div>
      <div style="font-size: 12px; font-weight: 500; opacity: 0.9;">
        Штраф за сегодня: 0 сум. Серия побед растет!
      </div>
    `;
    todayLog.status = 'success';
    todayLog.penalty = 0;
  } else {
    const remaining = target - done;
    statusText.textContent = `Осталось отжаться: ${remaining}`;
    statusText.style.color = 'var(--text-muted)';
    penaltyStat.textContent = '⚠️ 5 000 сум';
    penaltyStat.style.color = 'var(--accent-red)';

    verdictBox.className = 'day-verdict-box verdict-penalty';
    verdictBox.innerHTML = `
      <div>⚠️ ПЛАН ЕЩЕ НЕ ВЫПОЛНЕН!</div>
      <div style="font-size: 12px; font-weight: 500; opacity: 0.9;">
        Если не сделать ${remaining} раз(а) до полуночи, штраф составит <b>5 000 сум</b>!
      </div>
    `;
  }

  saveCurrentUser();
  renderPushupHistory();
}

function addPushupReps(count) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const log = currentUser.pushupLogs[todayKey];

  log.done = (log.done || 0) + count;
  playHapticSound('rep');
  renderPushups();
  renderPenalties();
}

function completeAllPushups() {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const log = currentUser.pushupLogs[todayKey];
  log.done = Math.max(log.done, log.target);
  playHapticSound('targetAchieved');
  renderPushups();
  renderPenalties();
}

function addCustomReps() {
  const input = document.getElementById('customRepsInput');
  const count = parseInt(input.value, 10);
  if (!isNaN(count) && count > 0) {
    addPushupReps(count);
    input.value = '';
  }
}

function resetTodayPushups() {
  if (!currentUser) return;
  if (confirm('Сбросить количество отжиманий за сегодня на 0?')) {
    const todayKey = getTodayDateKey();
    currentUser.pushupLogs[todayKey].done = 0;
    saveCurrentUser();
    renderPushups();
    renderPenalties();
  }
}

function openChangeTargetModal() {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const log = currentUser.pushupLogs[todayKey];
  document.getElementById('newTargetInput').value = log.target || 50;
  document.getElementById('targetModal').classList.remove('hidden');
}

function closeTargetModal() {
  document.getElementById('targetModal').classList.add('hidden');
}

function saveNewPushupTarget(e) {
  e.preventDefault();
  if (!currentUser) return;
  const val = parseInt(document.getElementById('newTargetInput').value, 10);
  if (val >= 5) {
    currentUser.pushupTarget = val;
    const todayKey = getTodayDateKey();
    currentUser.pushupLogs[todayKey].target = val;
    saveCurrentUser();
    closeTargetModal();
    renderPushups();
  }
}

function renderPushupHistory() {
  const list = document.getElementById('pushupHistoryList');
  if (!list || !currentUser) return;
  list.innerHTML = '';

  const logs = currentUser.pushupLogs || {};
  const sortedDates = Object.keys(logs).sort().reverse().slice(0, 7);

  if (sortedDates.length === 0) {
    list.innerHTML = '<div style="color: var(--text-dim); font-size: 13px;">История пока пуста</div>';
    return;
  }

  sortedDates.forEach(dateKey => {
    const entry = logs[dateKey];
    const item = document.createElement('div');
    item.className = 'history-item';

    const isSuccess = entry.done >= entry.target;
    const dateFormatted = new Date(dateKey).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    item.innerHTML = `
      <span class="history-date">${dateFormatted}</span>
      <span class="history-stats ${isSuccess ? 'text-green' : 'text-red'}">
        ${entry.done} / ${entry.target} отжиманий ${isSuccess ? '✓' : '(Штраф 5 000 сум)'}
      </span>
    `;
    list.appendChild(item);
  });
}

/* =========================================================
   PENALTY BANK & MONTHLY STATS
   ========================================================= */

function changePenaltyMonth(delta) {
  selectedPenaltyDate.setMonth(selectedPenaltyDate.getMonth() + delta);
  renderPenalties();
}

function renderPenalties() {
  if (!currentUser) return;

  const year = selectedPenaltyDate.getFullYear();
  const month = selectedPenaltyDate.getMonth(); // 0-indexed

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  document.getElementById('selectedMonthName').textContent = `${monthNames[month]} ${year}`;
  document.getElementById('penaltyMonthLabel').textContent = `Итого за ${monthNames[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const maxDayToCheck = isCurrentMonth ? today.getDate() : daysInMonth;

  let totalPenalty = 0;
  let successDays = 0;
  let missedDays = 0;

  const daysListEl = document.getElementById('monthDaysList');
  daysListEl.innerHTML = '';

  for (let day = 1; day <= maxDayToCheck; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = currentUser.pushupLogs ? currentUser.pushupLogs[dateKey] : null;

    const row = document.createElement('div');
    const isToday = isCurrentMonth && day === today.getDate();

    if (log && log.done >= log.target) {
      successDays++;
      row.className = 'month-day-row success';
      row.innerHTML = `
        <span>${day} ${monthNames[month]} ${isToday ? '(Сегодня)' : ''}</span>
        <span class="text-green">✓ ${log.done} отж. (0 сум)</span>
      `;
    } else {
      if (isToday) {
        // Today is pending until finished
        row.className = 'month-day-row';
        row.innerHTML = `
          <span>${day} ${monthNames[month]} (Сегодня)</span>
          <span style="color: var(--accent-yellow)">В процессе...</span>
        `;
      } else {
        missedDays++;
        totalPenalty += PENALTY_AMOUNT_PER_DAY;
        row.className = 'month-day-row missed';
        row.innerHTML = `
          <span>${day} ${monthNames[month]}</span>
          <span class="text-red">✕ Пропуск (+5 000 сум)</span>
        `;
      }
    }

    daysListEl.prepend(row);
  }

  const totalTrackedDays = successDays + missedDays;
  const rate = totalTrackedDays > 0 ? Math.round((successDays / totalTrackedDays) * 100) : 0;

  document.getElementById('monthlyPenaltyTotal').textContent = formatCurrencyUZS(totalPenalty);
  document.getElementById('monthSuccessDays').textContent = successDays;
  document.getElementById('monthMissedDays').textContent = missedDays;
  document.getElementById('monthSuccessRate').textContent = `${rate}%`;
}

/* =========================================================
   BACKUP & RESTORE
   ========================================================= */

function exportDataBackup() {
  if (!currentUser) return;
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentUser, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `discipline_backup_${currentUser.username}_${getTodayDateKey()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDataBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData && importedData.username && importedData.scheduleSlots) {
        const users = getAllUsers();
        users[importedData.username] = importedData;
        saveAllUsers(users);
        currentUser = importedData;
        localStorage.setItem(CURRENT_USER_KEY, importedData.username);
        alert('Данные успешно восстановлены!');
        showMainScreen();
      } else {
        alert('Неверный формат файла резервной копии.');
      }
    } catch (err) {
      alert('Ошибка при чтении файла.');
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   HELPERS & SOUND SYNTHESIS
   ========================================================= */

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getCategoryName(cat) {
  const map = {
    routine: '🌅 Рутина / Утро',
    work: '💼 Работа / Учеба',
    sport: '🥊 Спорт / Отжимания',
    rest: '🧘 Отдых / Обед',
    sleep: '🌙 Сон / Отбой'
  };
  return map[cat] || 'Общее дело';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Built-in Web Audio API haptic sound effects (no external audio files needed!)
function playHapticSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'rep') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success' || type === 'targetAchieved') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

/* =========================================================
   PWA SERVICE WORKER
   ========================================================= */

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Offline cache optional
    });
  }
}
