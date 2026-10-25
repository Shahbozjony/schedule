/**
 * DISCIPLINE OS - Main Application Logic v5
 * Custom Categories, Block-Level Exercises & Planks, Configurable Penalties, Full Reports & Telegram/Cloudflare Bot
 */

// Storage Keys
const USERS_STORAGE_KEY = 'discipline_os_users_v1';
const CURRENT_USER_KEY = 'discipline_os_current_user_v1';
const DEFAULT_PENALTY_AMOUNT = 5000; // 5 000 сум

// State
let currentUser = null;
let selectedPenaltyDate = new Date(); // Tracks viewing month in penalty tab
let currentReportPeriod = 'all'; // 'all' | 'month' | 'week'
let lastNotifiedMinute = ''; // Prevents duplicate TG notifications in the same minute

// Default categories
const DEFAULT_CATEGORIES = [
  { id: 'routine', name: 'Утро / Рутина', emoji: '🌅', color: '#38bdf8' },
  { id: 'work', name: 'Работа / Учеба', emoji: '💼', color: '#818cf8' },
  { id: 'sport', name: 'Спорт / Тренировка', emoji: '🥊', color: '#f43f5e' },
  { id: 'rest', name: 'Отдых / Обед', emoji: '🧘', color: '#34d399' },
  { id: 'sleep', name: 'Сон / Отбой', emoji: '🌙', color: '#a78bfa' }
];

// Default strict schedule for newly registered users with integrated exercises & penalties
const DEFAULT_SCHEDULE_SLOTS = [
  { id: 's1', name: '🌅 Подъем, вода, зарядка', start: '06:30', end: '07:15', category: 'routine', penalty: 2000, exercises: [] },
  { 
    id: 's2', 
    name: '💪 Тренировка и норма отжиманий', 
    start: '07:15', 
    end: '08:00', 
    category: 'sport', 
    penalty: 5000, 
    exercises: [
      { name: 'Отжимания от пола', sets: 4, target: 25, unit: 'раз' },
      { name: 'Планка', sets: 3, target: 60, unit: 'сек' }
    ] 
  },
  { id: 's3', name: '🍳 Питательный завтрак и душ', start: '08:00', end: '08:45', category: 'routine', penalty: 2000, exercises: [] },
  { id: 's4', name: '🎯 Глубокая работа / Учеба (Блок 1)', start: '09:00', end: '13:00', category: 'work', penalty: 10000, exercises: [] },
  { id: 's5', name: '🥗 Обед и перезагрузка', start: '13:00', end: '14:00', category: 'rest', penalty: 2000, exercises: [] },
  { id: 's6', name: '💼 Работа, задачи и проекты (Блок 2)', start: '14:00', end: '18:00', category: 'work', penalty: 10000, exercises: [] },
  { id: 's7', name: '🚶 Прогулка, разгрузка, свежий воздух', start: '18:00', end: '19:00', category: 'rest', penalty: 3000, exercises: [] },
  { id: 's8', name: '🍽️ Ужин и время с семьей', start: '19:00', end: '20:30', category: 'routine', penalty: 3000, exercises: [] },
  { id: 's9', name: '📚 Чтение книги и итоги дня', start: '20:30', end: '22:00', category: 'work', penalty: 5000, exercises: [] },
  { id: 's10', name: '🌙 Подготовка ко сну, без гаджетов', start: '22:30', end: '23:00', category: 'sleep', penalty: 5000, exercises: [] }
];

// Initialize application on page load
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  checkAuthSession();
  registerServiceWorker();
  initTelegramReminderDaemon();
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
    ensureUserDefaults();
    showMainScreen();
  } else {
    showAuthScreen();
  }
}

function ensureUserDefaults() {
  if (!currentUser) return;
  if (!currentUser.categories || currentUser.categories.length === 0) {
    currentUser.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!currentUser.scheduleSlots) {
    currentUser.scheduleSlots = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_SLOTS));
  }
  // Ensure slots have penalty & exercises fields
  currentUser.scheduleSlots.forEach(slot => {
    if (slot.penalty === undefined) slot.penalty = DEFAULT_PENALTY_AMOUNT;
    if (!slot.exercises) slot.exercises = [];
  });
  if (!currentUser.telegramConfig) {
    currentUser.telegramConfig = { token: '', chatId: '', notifyBlocks: true, notifyPenalties: true };
  }
  initUserExercises();
  saveCurrentUser();
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

  const todayKey = getTodayDateKey();
  const newUser = {
    name: name,
    username: username,
    password: password,
    createdAt: new Date().toISOString(),
    streak: 0,
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    scheduleSlots: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_SLOTS)),
    scheduleCompletions: {},
    workoutLogs: {
      [todayKey]: { status: 'pending', penalty: 5000, exercises: {} }
    },
    telegramConfig: { token: '', chatId: '', notifyBlocks: true, notifyPenalties: true }
  };

  users[username] = newUser;
  saveAllUsers(users);

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
  ensureUserDefaults();
  localStorage.setItem(CURRENT_USER_KEY, username);

  document.getElementById('loginForm').reset();
  showMainScreen();
}

function handleLogout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  currentUser = null;
  closeProfileModal();
  showAuthScreen();
}

function confirmDeleteAccount() {
  if (!currentUser) return;

  const confirmed = confirm(
    `ВНИМАНИЕ!\n\nВы действительно хотите навсегда удалить аккаунт @${currentUser.username}?\n\nВсе ваши тренировки, жесткое расписание и история штрафов будут стёрты БЕЗ ВОЗМОЖНОСТИ восстановления!`
  );

  if (!confirmed) return;

  const doubleCheck = prompt('Для подтверждения напишите слово "УДАЛИТЬ":');
  if (doubleCheck && doubleCheck.trim().toUpperCase() === 'УДАЛИТЬ') {
    const users = getAllUsers();
    delete users[currentUser.username];
    saveAllUsers(users);

    localStorage.removeItem(CURRENT_USER_KEY);
    currentUser = null;

    closeProfileModal();
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

  ensureUserDefaults();
  renderUserProfile();
  renderSchedule();
  renderPushups();
  renderPenalties();
  renderReport();
}

/* =========================================================
   DATE & PENALTY LOGIC
   ========================================================= */

function getTodayDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrencyUZS(amount) {
  return new Intl.NumberFormat('ru-RU').format(amount || 0) + ' сум';
}

/* =========================================================
   NAVIGATION & TABS
   ========================================================= */

function switchView(viewId) {
  const views = ['viewSchedule', 'viewPushups', 'viewPenalties', 'viewReport'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) {
      el.classList.remove('active');
      el.classList.add('hidden');
    }
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
    targetView.classList.remove('hidden');
  }

  const tabs = document.querySelectorAll('.nav-tab-item');
  tabs.forEach(tab => {
    const onclickAttr = tab.getAttribute('onclick') || '';
    if (onclickAttr.includes(viewId)) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  if (viewId === 'viewSchedule') renderSchedule();
  if (viewId === 'viewPushups') renderPushups();
  if (viewId === 'viewPenalties') renderPenalties();
  if (viewId === 'viewReport') renderReport();
}

/* =========================================================
   LIVE CLOCK & PROFILE MODAL
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

  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) userAvatar.textContent = firstLetter;

  const displayName = document.getElementById('displayName');
  if (displayName) displayName.textContent = currentUser.name;

  const profileBigAvatar = document.getElementById('profileBigAvatar');
  if (profileBigAvatar) profileBigAvatar.textContent = firstLetter;

  const profileName = document.getElementById('profileName');
  if (profileName) profileName.textContent = currentUser.name;

  const profileUsername = document.getElementById('profileUsername');
  if (profileUsername) profileUsername.textContent = `@${currentUser.username}`;

  const createdDate = new Date(currentUser.createdAt || Date.now());
  const memberSince = document.getElementById('memberSince');
  if (memberSince) memberSince.textContent = `В системе с ${createdDate.toLocaleDateString('ru-RU')}`;

  // Populate Telegram inputs
  if (currentUser.telegramConfig) {
    const tgToken = document.getElementById('tgBotToken');
    const tgChat = document.getElementById('tgChatId');
    const tgBlocks = document.getElementById('tgNotifyBlocks');
    const tgPenalties = document.getElementById('tgNotifyPenalties');

    if (tgToken) tgToken.value = currentUser.telegramConfig.token || '';
    if (tgChat) tgChat.value = currentUser.telegramConfig.chatId || '';
    if (tgBlocks) tgBlocks.checked = currentUser.telegramConfig.notifyBlocks !== false;
    if (tgPenalties) tgPenalties.checked = currentUser.telegramConfig.notifyPenalties !== false;
  }
}

function openProfileModal() {
  renderUserProfile();
  document.getElementById('profileModal').classList.remove('hidden');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.add('hidden');
}

/* =========================================================
   CUSTOM CATEGORIES MANAGEMENT
   ========================================================= */

function getCategory(catId) {
  if (!currentUser || !currentUser.categories) return { name: 'Общее дело', emoji: '📌', color: '#818cf8' };
  const found = currentUser.categories.find(c => c.id === catId);
  return found || { name: 'Общее дело', emoji: '📌', color: '#818cf8' };
}

function populateCategorySelect(selectedId) {
  const select = document.getElementById('slotCategory');
  if (!select || !currentUser) return;
  select.innerHTML = '';

  const categories = currentUser.categories || DEFAULT_CATEGORIES;
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.emoji} ${cat.name}`;
    if (cat.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

function openAddCategoryModal() {
  document.getElementById('newCatName').value = '';
  document.getElementById('newCatEmoji').value = '🎯';
  document.getElementById('newCatColor').value = '#6366f1';
  document.getElementById('categoryModal').classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.add('hidden');
}

function saveCustomCategory(e) {
  e.preventDefault();
  if (!currentUser) return;

  const name = document.getElementById('newCatName').value.trim();
  const emoji = document.getElementById('newCatEmoji').value.trim() || '📌';
  const color = document.getElementById('newCatColor').value || '#6366f1';

  if (!name) return;

  const newCat = {
    id: 'cat_' + Date.now(),
    name,
    emoji,
    color
  };

  if (!currentUser.categories) currentUser.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  currentUser.categories.push(newCat);
  saveCurrentUser();

  closeCategoryModal();
  populateCategorySelect(newCat.id);
  renderSchedule();
  renderReport();
}

/* =========================================================
   SCHEDULE TAB LOGIC (С упражнениями и штрафами за блок)
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

    const cat = getCategory(slot.category);

    // Exercise badges subline (Рисунок 2)
    let exerciseSubHtml = '';
    if (slot.exercises && slot.exercises.length > 0) {
      const badges = slot.exercises.map(ex => {
        const icon = ex.unit === 'сек' ? '⏱️' : '💪';
        return `<span class="timeline-ex-badge">${icon} ${escapeHtml(ex.name)}: ${ex.sets} подх. × ${ex.target} ${ex.unit || 'раз'}</span>`;
      }).join('');
      exerciseSubHtml = `<div class="timeline-exercise-sub">${badges}</div>`;
    }

    const penaltyBadge = slot.penalty > 0 
      ? `<span class="timeline-penalty-badge">Штраф: ${formatCurrencyUZS(slot.penalty)}</span>`
      : '';

    const itemEl = document.createElement('div');
    itemEl.className = `timeline-item ${isNow ? 'active-now' : ''} ${isCompleted ? 'completed' : ''}`;
    
    itemEl.innerHTML = `
      <div class="timeline-time-col">
        <span class="time-start">${slot.start}</span>
        <span class="time-end">${slot.end}</span>
      </div>
      <div class="cat-indicator" style="background-color: ${cat.color};"></div>
      <div class="timeline-info-col" onclick="openEditSlotModal('${slot.id}')">
        <div class="slot-title">${cat.emoji} ${escapeHtml(slot.name)}</div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
          <span class="slot-category-name">${cat.name}</span>
          ${penaltyBadge}
        </div>
        ${exerciseSubHtml}
      </div>
      <button class="timeline-check ${isCompleted ? 'checked' : ''}" onclick="toggleSlotCompletion('${slot.id}')">
        ${isCompleted ? '✓' : ''}
      </button>
    `;
    listEl.appendChild(itemEl);
  });

  renderFocusCard(activeBlock, completedSlots);

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
  renderPenalties();
  renderReport();
}

// Modal: Add / Edit Block with Exercises and Configurable Penalty
function openAddSlotModal() {
  document.getElementById('modalSlotTitle').textContent = 'Новый блок времени';
  document.getElementById('slotId').value = '';
  document.getElementById('slotName').value = '';
  document.getElementById('slotStart').value = '10:00';
  document.getElementById('slotEnd').value = '11:00';
  document.getElementById('slotPenalty').value = '5000';
  populateCategorySelect('work');

  document.getElementById('slotExercisesContainer').innerHTML = '';
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
  document.getElementById('slotPenalty').value = slot.penalty !== undefined ? slot.penalty : 5000;
  populateCategorySelect(slot.category || 'work');

  // Render exercises
  renderSlotExercisesInModal(slot.exercises || []);

  document.getElementById('deleteSlotBtn').classList.remove('hidden');
  document.getElementById('slotModal').classList.remove('hidden');
}

function closeSlotModal() {
  document.getElementById('slotModal').classList.add('hidden');
}

function renderSlotExercisesInModal(exercises) {
  const container = document.getElementById('slotExercisesContainer');
  container.innerHTML = '';
  exercises.forEach(ex => {
    addExerciseFieldToSlot(ex.name, ex.sets, ex.target, ex.unit);
  });
}

function addExerciseFieldToSlot(name = '', sets = 3, target = 20, unit = 'раз') {
  const container = document.getElementById('slotExercisesContainer');
  const row = document.createElement('div');
  row.className = 'slot-ex-row';
  row.innerHTML = `
    <input type="text" placeholder="Упражнение (Отжимания, Планка)" value="${escapeHtml(name)}" required class="ex-name-input">
    <input type="number" placeholder="Подх." min="1" max="100" value="${sets}" title="Количество подходов" class="ex-sets-input">
    <input type="number" placeholder="Цель" min="1" max="1000" value="${target}" title="Повторений или секунд" class="ex-target-input">
    <select class="ex-unit-input">
      <option value="раз" ${unit === 'раз' ? 'selected' : ''}>раз</option>
      <option value="сек" ${unit === 'сек' ? 'selected' : ''}>сек</option>
      <option value="мин" ${unit === 'мин' ? 'selected' : ''}>мин</option>
    </select>
    <button type="button" class="slot-ex-delete-btn" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}

function saveScheduleSlot(e) {
  e.preventDefault();
  if (!currentUser) return;

  const slotId = document.getElementById('slotId').value;
  const name = document.getElementById('slotName').value.trim();
  const start = document.getElementById('slotStart').value;
  const end = document.getElementById('slotEnd').value;
  const category = document.getElementById('slotCategory').value;
  const penalty = parseInt(document.getElementById('slotPenalty').value, 10) || 0;

  // Extract exercises from modal container
  const exercises = [];
  const rows = document.querySelectorAll('#slotExercisesContainer .slot-ex-row');
  rows.forEach(r => {
    const exName = r.querySelector('.ex-name-input').value.trim();
    const sets = parseInt(r.querySelector('.ex-sets-input').value, 10) || 1;
    const target = parseInt(r.querySelector('.ex-target-input').value, 10) || 10;
    const unit = r.querySelector('.ex-unit-input').value || 'раз';
    if (exName) {
      exercises.push({ name: exName, sets, target, unit });
    }
  });

  if (slotId) {
    const slot = currentUser.scheduleSlots.find(s => s.id === slotId);
    if (slot) {
      slot.name = name;
      slot.start = start;
      slot.end = end;
      slot.category = category;
      slot.penalty = penalty;
      slot.exercises = exercises;
    }
  } else {
    currentUser.scheduleSlots.push({
      id: 's_' + Date.now(),
      name,
      start,
      end,
      category,
      penalty,
      exercises
    });
  }

  saveCurrentUser();
  closeSlotModal();
  renderSchedule();
  renderPenalties();
  renderReport();
}

function deleteCurrentSlot() {
  const slotId = document.getElementById('slotId').value;
  if (!slotId || !currentUser) return;

  if (confirm('Удалить этот блок из расписания?')) {
    currentUser.scheduleSlots = currentUser.scheduleSlots.filter(s => s.id !== slotId);
    saveCurrentUser();
    closeSlotModal();
    renderSchedule();
    renderPenalties();
    renderReport();
  }
}

/* =========================================================
   WORKOUT TAB LOGIC (Multi-exercise Tracker)
   ========================================================= */

const DEFAULT_EXERCISES = [
  { id: 'ex_pushups', name: 'Отжимания от пола', icon: '💥', type: 'reps', target: 50 },
  { id: 'ex_bench', name: 'Жим штанги лежа', icon: '🏋️', type: 'sets', target: 4 },
  { id: 'ex_triceps', name: 'Гантели на трицепс', icon: '💪', type: 'sets', target: 3 },
  { id: 'ex_plank', name: 'Планка на предплечьях', icon: '⏱️', type: 'reps', target: 120 }
];

function initUserExercises() {
  if (!currentUser) return;
  if (!currentUser.exercises || currentUser.exercises.length === 0) {
    currentUser.exercises = JSON.parse(JSON.stringify(DEFAULT_EXERCISES));
  }
  if (!currentUser.workoutLogs) {
    currentUser.workoutLogs = {};
  }
  const todayKey = getTodayDateKey();
  if (!currentUser.workoutLogs[todayKey]) {
    currentUser.workoutLogs[todayKey] = {
      status: 'pending',
      penalty: 5000,
      exercises: {}
    };
  }

  currentUser.exercises.forEach(ex => {
    if (!currentUser.workoutLogs[todayKey].exercises[ex.id]) {
      currentUser.workoutLogs[todayKey].exercises[ex.id] = ex.type === 'reps' 
        ? { done: 0, completed: false }
        : { sets: [], completed: false };
    }
  });

  saveCurrentUser();
}

function renderPushups() {
  if (!currentUser) return;
  initUserExercises();

  const todayKey = getTodayDateKey();
  const todayLog = currentUser.workoutLogs[todayKey];
  const exercises = currentUser.exercises;

  const container = document.getElementById('exercisesContainer');
  if (!container) return;
  container.innerHTML = '';

  let completedCount = 0;

  exercises.forEach(ex => {
    const exData = todayLog.exercises[ex.id] || (ex.type === 'reps' ? { done: 0, completed: false } : { sets: [], completed: false });
    
    let isCompleted = exData.completed;
    if (ex.type === 'reps' && exData.done >= ex.target) isCompleted = true;
    if (ex.type === 'sets' && exData.sets && exData.sets.length >= ex.target) isCompleted = true;
    if (isCompleted) completedCount++;

    const card = document.createElement('div');
    card.className = `exercise-card ${isCompleted ? 'completed' : ''}`;

    let bodyHtml = '';

    if (ex.type === 'reps') {
      const done = exData.done || 0;
      const target = ex.target || 50;
      const percent = Math.min(100, Math.round((done / target) * 100));
      const unitLabel = ex.id.includes('plank') ? 'сек удержано' : 'повторений сделано';

      bodyHtml = `
        <div class="pushup-counter-box" style="margin: 6px 0 10px;">
          <div class="counter-display">
            <span class="count-done" style="font-size: 38px;">${done}</span>
            <span class="count-divider">/</span>
            <span class="count-target" style="font-size: 28px;">${target}</span>
          </div>
          <div class="counter-sub">${unitLabel}</div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${percent}%;"></div>
        </div>
        <div class="progress-status-row" style="margin-bottom: 8px;">
          <span>${isCompleted ? '✓ Выполнено!' : 'Осталось: ' + Math.max(0, target - done)}</span>
          <span>${percent}%</span>
        </div>
        <div class="quick-add-grid">
          <button class="rep-btn" onclick="addRepsToExercise('${ex.id}', 10)">+10</button>
          <button class="rep-btn" onclick="addRepsToExercise('${ex.id}', 20)">+20</button>
          <button class="rep-btn" onclick="addRepsToExercise('${ex.id}', 30)">+30</button>
          <button class="rep-btn" onclick="completeRepsExercise('${ex.id}')">Завершить 🎯</button>
        </div>
      `;
    } else {
      const sets = exData.sets || [];
      const setsHtml = sets.length > 0 
        ? sets.map((s, idx) => `
            <div class="set-chip">
              <span class="set-num">#${idx + 1}</span>
              <span>${s.weight} кг × ${s.reps} раз</span>
              <span class="set-chip-delete" onclick="deleteSet('${ex.id}', ${idx})">✕</span>
            </div>
          `).join('')
        : '<div style="font-size: 12px; color: var(--text-dim);">Подходы пока не записаны</div>';

      bodyHtml = `
        <div class="sets-chips-list">
          ${setsHtml}
        </div>
        <div class="ex-card-actions">
          <button class="add-set-trigger-btn" onclick="openAddSetModal('${ex.id}', '${escapeHtml(ex.name)}')">
            + Записать подход (${sets.length}/${ex.target})
          </button>
          <button class="quick-done-check-btn ${isCompleted ? 'done' : ''}" onclick="toggleExerciseCompleted('${ex.id}')">
            ${isCompleted ? '✓ Сделано' : 'Завершить'}
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="ex-header">
        <div class="ex-title-wrap">
          <div class="ex-icon">${ex.icon || '🏋️'}</div>
          <div>
            <div class="ex-name">${escapeHtml(ex.name)}</div>
            <div class="ex-meta">${ex.type === 'sets' ? `Цель: ${ex.target} подх.` : `Цель: ${ex.target} повт./сек`}</div>
          </div>
        </div>
        <div class="ex-actions-top">
          <button class="ex-btn-icon" title="Изменить цель" onclick="openChangeTargetModalEx('${ex.id}', ${ex.target}, '${ex.type}')">✏️</button>
          <button class="ex-btn-icon" title="Удалить упражнение" onclick="deleteExercise('${ex.id}')">🗑️</button>
        </div>
      </div>
      ${bodyHtml}
    `;

    container.appendChild(card);
  });

  const streakEl = document.getElementById('streakCount');
  if (streakEl) streakEl.textContent = currentUser.streak || 0;

  const exDoneEl = document.getElementById('workoutExercisesDone');
  if (exDoneEl) exDoneEl.textContent = `${completedCount}/${exercises.length}`;

  const penaltyStat = document.getElementById('todayPenaltyStatus');
  const verdictBox = document.getElementById('dayVerdictBox');

  const isAllDone = exercises.length > 0 && completedCount === exercises.length;

  if (isAllDone || todayLog.status === 'success') {
    todayLog.status = 'success';
    todayLog.penalty = 0;
    if (penaltyStat) {
      penaltyStat.textContent = '0 сум';
      penaltyStat.style.color = 'var(--accent-green)';
    }

    if (verdictBox) {
      verdictBox.className = 'day-verdict-box verdict-success';
      verdictBox.innerHTML = `
        <div>🎯 ТРЕНИРОВКА ДНЯ ВЫПОЛНЕНА! Красавчик!</div>
        <div style="font-size: 12px; font-weight: 500; opacity: 0.9;">
          Штраф за сегодня: 0 сум. Серия побед продолжается!
        </div>
      `;
    }
  } else {
    todayLog.status = 'pending';
    todayLog.penalty = 5000;
    if (penaltyStat) {
      penaltyStat.textContent = '5 000 сум';
      penaltyStat.style.color = 'var(--accent-red)';
    }

    if (verdictBox) {
      verdictBox.className = 'day-verdict-box verdict-penalty';
      verdictBox.innerHTML = `
        <div>⚠️ ТРЕНИРОВКА В ПРОЦЕССЕ (${completedCount}/${exercises.length})</div>
        <div style="font-size: 12px; font-weight: 500; opacity: 0.9;">
          Закрой все упражнения до полуночи, иначе штраф составит <b>5 000 сум</b>!
        </div>
      `;
    }
  }

  saveCurrentUser();
  renderWorkoutHistory();
}

function addRepsToExercise(exId, count) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const exData = currentUser.workoutLogs[todayKey].exercises[exId];
  exData.done = (exData.done || 0) + count;
  playHapticSound('rep');
  renderPushups();
  renderReport();
}

function completeRepsExercise(exId) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const ex = currentUser.exercises.find(e => e.id === exId);
  const exData = currentUser.workoutLogs[todayKey].exercises[exId];
  exData.done = Math.max(exData.done || 0, ex.target);
  exData.completed = true;
  playHapticSound('targetAchieved');
  renderPushups();
  renderReport();
}

function openAddSetModal(exId, exName) {
  document.getElementById('setExerciseId').value = exId;
  document.getElementById('setModalExerciseTitle').textContent = `Подход: ${exName}`;
  document.getElementById('setWeightInput').value = '';
  document.getElementById('setRepsInput').value = '';
  document.getElementById('setModal').classList.remove('hidden');
}

function closeSetModal() {
  document.getElementById('setModal').classList.add('hidden');
}

function saveExerciseSet(e) {
  e.preventDefault();
  if (!currentUser) return;
  const exId = document.getElementById('setExerciseId').value;
  const weight = parseFloat(document.getElementById('setWeightInput').value) || 0;
  const reps = parseInt(document.getElementById('setRepsInput').value, 10) || 0;

  const todayKey = getTodayDateKey();
  const exData = currentUser.workoutLogs[todayKey].exercises[exId];
  if (!exData.sets) exData.sets = [];
  exData.sets.push({ weight, reps });

  playHapticSound('rep');
  closeSetModal();
  renderPushups();
  renderReport();
}

function deleteSet(exId, setIdx) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const exData = currentUser.workoutLogs[todayKey].exercises[exId];
  if (exData && exData.sets) {
    exData.sets.splice(setIdx, 1);
    renderPushups();
    renderReport();
  }
}

function toggleExerciseCompleted(exId) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const exData = currentUser.workoutLogs[todayKey].exercises[exId];
  exData.completed = !exData.completed;
  playHapticSound('success');
  renderPushups();
  renderReport();
}

function completeFullWorkoutToday() {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const todayLog = currentUser.workoutLogs[todayKey];
  todayLog.status = 'success';
  todayLog.penalty = 0;

  currentUser.exercises.forEach(ex => {
    const exData = todayLog.exercises[ex.id];
    if (exData) exData.completed = true;
  });

  playHapticSound('targetAchieved');
  alert('Поздравляем! Тренировка дня полностью закрыта без штрафов! 🔥💪');
  renderPushups();
  renderPenalties();
  renderReport();
}

function openAddExerciseModal() {
  document.getElementById('newExerciseName').value = '';
  document.getElementById('newExerciseType').value = 'sets';
  document.getElementById('newExerciseTarget').value = '4';
  document.getElementById('newExTargetLabel').textContent = 'Целевое количество подходов';
  document.getElementById('exerciseModal').classList.remove('hidden');
}

function closeExerciseModal() {
  document.getElementById('exerciseModal').classList.add('hidden');
}

function toggleExerciseTypeFields() {
  const type = document.getElementById('newExerciseType').value;
  const lbl = document.getElementById('newExTargetLabel');
  const targetInput = document.getElementById('newExerciseTarget');
  if (type === 'sets') {
    lbl.textContent = 'Целевое количество подходов';
    targetInput.value = '4';
  } else {
    lbl.textContent = 'Целевое количество повторений';
    targetInput.value = '50';
  }
}

function saveCustomExercise(e) {
  e.preventDefault();
  if (!currentUser) return;
  const name = document.getElementById('newExerciseName').value.trim();
  const type = document.getElementById('newExerciseType').value;
  const target = parseInt(document.getElementById('newExerciseTarget').value, 10) || 4;

  const icons = { sets: '🏋️', reps: '💥' };
  const newEx = {
    id: 'ex_' + Date.now(),
    name,
    icon: icons[type] || '💪',
    type,
    target
  };

  currentUser.exercises.push(newEx);
  saveCurrentUser();
  closeExerciseModal();
  renderPushups();
  renderReport();
}

function deleteExercise(exId) {
  if (!currentUser) return;
  if (currentUser.exercises.length <= 1) {
    alert('Должно остаться хотя бы одно упражнение в программе!');
    return;
  }
  if (confirm('Удалить это упражнение из программы?')) {
    currentUser.exercises = currentUser.exercises.filter(e => e.id !== exId);
    saveCurrentUser();
    renderPushups();
    renderReport();
  }
}

function openChangeTargetModalEx(exId, currentVal, type) {
  document.getElementById('editExerciseId').value = exId;
  document.getElementById('targetModalLabel').textContent = type === 'sets' ? 'Цель (подходов)' : 'Цель (повторений)';
  document.getElementById('newTargetInput').value = currentVal;
  document.getElementById('targetModal').classList.remove('hidden');
}

function closeTargetModal() {
  document.getElementById('targetModal').classList.add('hidden');
}

function saveNewTarget(e) {
  e.preventDefault();
  if (!currentUser) return;
  const exId = document.getElementById('editExerciseId').value;
  const val = parseInt(document.getElementById('newTargetInput').value, 10);
  if (val >= 1) {
    const ex = currentUser.exercises.find(e => e.id === exId);
    if (ex) ex.target = val;
    saveCurrentUser();
    closeTargetModal();
    renderPushups();
  }
}

function renderWorkoutHistory() {
  const list = document.getElementById('pushupHistoryList');
  if (!list || !currentUser) return;
  list.innerHTML = '';

  const logs = currentUser.workoutLogs || {};
  const sortedDates = Object.keys(logs).sort().reverse().slice(0, 7);

  if (sortedDates.length === 0) {
    list.innerHTML = '<div style="color: var(--text-dim); font-size: 13px;">История пока пуста</div>';
    return;
  }

  sortedDates.forEach(dateKey => {
    const entry = logs[dateKey];
    const item = document.createElement('div');
    item.className = 'history-item';

    const isSuccess = entry.status === 'success' || entry.penalty === 0;
    const dateFormatted = new Date(dateKey).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    item.innerHTML = `
      <span class="history-date">${dateFormatted}</span>
      <span class="history-stats ${isSuccess ? 'text-green' : 'text-red'}">
        ${isSuccess ? '✓ Тренировка выполнена (0 сум)' : '✕ Пропуск (Штраф 5 000 сум)'}
      </span>
    `;
    list.appendChild(item);
  });
}

/* =========================================================
   PENALTY BANK & DETAILED MISSED BLOCKS LIST (Рисунок 3)
   ========================================================= */

function changePenaltyMonth(delta) {
  selectedPenaltyDate.setMonth(selectedPenaltyDate.getMonth() + delta);
  renderPenalties();
}

function renderPenalties() {
  if (!currentUser) return;

  const year = selectedPenaltyDate.getFullYear();
  const month = selectedPenaltyDate.getMonth();

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

  let totalMonthPenalty = 0;
  let successDays = 0;
  let missedDays = 0;

  const daysListEl = document.getElementById('monthDaysList');
  daysListEl.innerHTML = '';

  const slots = currentUser.scheduleSlots || [];

  for (let day = 1; day <= maxDayToCheck; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const completedList = (currentUser.scheduleCompletions && currentUser.scheduleCompletions[dateKey]) || [];
    const isToday = isCurrentMonth && day === today.getDate();

    // Check which slots were missed for this day
    const missedSlots = [];
    let dayPenaltySum = 0;

    slots.forEach(s => {
      if (!completedList.includes(s.id)) {
        // If it's today, check if time has passed
        if (isToday) {
          const nowMins = today.getHours() * 60 + today.getMinutes();
          if (nowMins > timeToMinutes(s.end)) {
            missedSlots.push(s);
            dayPenaltySum += (s.penalty || DEFAULT_PENALTY_AMOUNT);
          }
        } else {
          missedSlots.push(s);
          dayPenaltySum += (s.penalty || DEFAULT_PENALTY_AMOUNT);
        }
      }
    });

    const isDaySuccess = missedSlots.length === 0;

    const row = document.createElement('div');
    if (isDaySuccess) {
      successDays++;
      row.className = 'month-day-row success';
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <span>${day} ${monthNames[month]} ${isToday ? '(Сегодня)' : ''}</span>
          <span class="text-green">✓ Все блоки закрыты (0 сум)</span>
        </div>
      `;
    } else {
      if (isToday && missedSlots.length === 0) {
        row.className = 'month-day-row';
        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span>${day} ${monthNames[month]} (Сегодня)</span>
            <span style="color: var(--accent-yellow)">В процессе...</span>
          </div>
        `;
      } else {
        missedDays++;
        totalMonthPenalty += dayPenaltySum;
        row.className = 'month-day-row missed';
        row.style.flexDirection = 'column';
        row.style.alignItems = 'flex-start';
        row.style.gap = '6px';

        // Detailed breakdown of missed blocks (Рисунок 3 fix!)
        const missedListHtml = missedSlots.map(s => {
          let reqDesc = '';
          if (s.exercises && s.exercises.length > 0) {
            reqDesc = ' • Надо было: ' + s.exercises.map(ex => `${ex.name} ${ex.sets}×${ex.target} ${ex.unit || 'раз'}`).join(', ');
          }
          return `
            <div style="font-size: 11px; color: #fca5a5; line-height: 1.4; padding-left: 6px; border-left: 2px solid var(--accent-red);">
              <b>${s.start}-${s.end} ${escapeHtml(s.name)}</b>${escapeHtml(reqDesc)} — <span style="font-weight: 700;">+${formatCurrencyUZS(s.penalty || DEFAULT_PENALTY_AMOUNT)}</span>
            </div>
          `;
        }).join('');

        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span><b>${day} ${monthNames[month]}</b> ${isToday ? '(Сегодня)' : ''}</span>
            <span class="text-red"><b>✕ Штраф: ${formatCurrencyUZS(dayPenaltySum)}</b></span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; margin-top: 2px;">
            ${missedListHtml}
          </div>
        `;
      }
    }

    daysListEl.prepend(row);
  }

  const totalTrackedDays = successDays + missedDays;
  const rate = totalTrackedDays > 0 ? Math.round((successDays / totalTrackedDays) * 100) : 0;

  document.getElementById('monthlyPenaltyTotal').textContent = formatCurrencyUZS(totalMonthPenalty);
  document.getElementById('monthSuccessDays').textContent = successDays;
  document.getElementById('monthMissedDays').textContent = missedDays;
  document.getElementById('monthSuccessRate').textContent = `${rate}%`;
}

/* =========================================================
   REPORT TAB (Сводный отчет за весь период по категориям)
   ========================================================= */

function setReportPeriod(period) {
  currentReportPeriod = period;
  document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));

  if (period === 'all') document.getElementById('btnPeriodAll').classList.add('active');
  if (period === 'month') document.getElementById('btnPeriodMonth').classList.add('active');
  if (period === 'week') document.getElementById('btnPeriodWeek').classList.add('active');

  const descEl = document.getElementById('reportPeriodDesc');
  if (period === 'all') descEl.textContent = 'Показатели за всё время ведения системы';
  if (period === 'month') descEl.textContent = 'Показатели за текущий календарный месяц';
  if (period === 'week') descEl.textContent = 'Показатели за последние 7 дней';

  renderReport();
}

function renderReport() {
  if (!currentUser) return;

  const now = new Date();
  const completions = currentUser.scheduleCompletions || {};
  const workoutLogs = currentUser.workoutLogs || {};
  const slots = currentUser.scheduleSlots || [];
  const categories = currentUser.categories || DEFAULT_CATEGORIES;

  let totalReps = 0;
  let totalPlankSecs = 0;
  let totalBlocksDone = 0;
  let totalPenalty = 0;

  // Category completion counter: { [catId]: { count: 0, totalHours: 0 } }
  const catStats = {};
  categories.forEach(c => { catStats[c.id] = { count: 0, name: c.name, emoji: c.emoji, color: c.color }; });

  // Filter dates
  const allDates = Object.keys(completions);
  Object.keys(workoutLogs).forEach(d => { if (!allDates.includes(d)) allDates.push(d); });

  allDates.forEach(dateStr => {
    const d = new Date(dateStr);
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (currentReportPeriod === 'week' && diffDays > 7) return;
    if (currentReportPeriod === 'month') {
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
    }

    // Schedule blocks completed
    const dayCompletedSlotIds = completions[dateStr] || [];
    totalBlocksDone += dayCompletedSlotIds.length;

    dayCompletedSlotIds.forEach(id => {
      const s = slots.find(slot => slot.id === id);
      if (s && s.category && catStats[s.category]) {
        catStats[s.category].count++;
      }
    });

    // Workout logs
    const wLog = workoutLogs[dateStr];
    if (wLog && wLog.exercises) {
      Object.keys(wLog.exercises).forEach(exId => {
        const exData = wLog.exercises[exId];
        if (exId.includes('plank')) {
          totalPlankSecs += (exData.done || 0);
        } else {
          totalReps += (exData.done || 0);
          if (exData.sets) {
            exData.sets.forEach(set => { totalReps += (set.reps || 0); });
          }
        }
      });
    }

    // Missed blocks penalty for that date
    slots.forEach(s => {
      if (!dayCompletedSlotIds.includes(s.id)) {
        if (diffDays > 0) {
          totalPenalty += (s.penalty || DEFAULT_PENALTY_AMOUNT);
        }
      }
    });
  });

  // Update Big Cards
  document.getElementById('repTotalReps').textContent = totalReps;
  document.getElementById('repTotalPlank').textContent = totalPlankSecs > 60 
    ? `${Math.floor(totalPlankSecs / 60)} мин ${totalPlankSecs % 60} сек`
    : `${totalPlankSecs} сек`;
  document.getElementById('repTotalBlocksDone').textContent = totalBlocksDone;
  document.getElementById('repTotalPenalty').textContent = formatCurrencyUZS(totalPenalty);

  // Render Category Breakdown
  const catListEl = document.getElementById('categoriesReportList');
  if (catListEl) {
    catListEl.innerHTML = '';
    const maxCatCount = Math.max(1, ...Object.values(catStats).map(c => c.count));

    Object.values(catStats).forEach(c => {
      const pct = Math.round((c.count / maxCatCount) * 100);
      const row = document.createElement('div');
      row.className = 'cat-report-row';
      row.innerHTML = `
        <div class="cat-report-header">
          <span>${c.emoji} ${escapeHtml(c.name)}</span>
          <span style="color: ${c.color}; font-weight: 800;">${c.count} блоков закрыто</span>
        </div>
        <div class="cat-progress-bg">
          <div class="cat-progress-fill" style="width: ${pct}%; background-color: ${c.color};"></div>
        </div>
      `;
      catListEl.appendChild(row);
    });
  }

  // Render Exercise Breakdown
  const exListEl = document.getElementById('exerciseReportList');
  if (exListEl && currentUser.exercises) {
    exListEl.innerHTML = '';
    currentUser.exercises.forEach(ex => {
      const row = document.createElement('div');
      row.className = 'exercise-report-item';
      
      const isPlank = ex.id.includes('plank');
      row.innerHTML = `
        <div class="ex-rep-title">
          <span>${ex.icon || '🏋️'}</span>
          <span>${escapeHtml(ex.name)}</span>
        </div>
        <div class="ex-rep-val">
          ${isPlank ? `${totalPlankSecs} сек` : (ex.type === 'sets' ? `Цель: ${ex.target} подх.` : `Норма: ${ex.target} раз`)}
        </div>
      `;
      exListEl.appendChild(row);
    });
  }
}

/* =========================================================
   TELEGRAM BOT & CLOUDFLARE INTEGRATION
   ========================================================= */

function saveTelegramSettings() {
  if (!currentUser) return;
  const token = document.getElementById('tgBotToken').value.trim();
  const chatId = document.getElementById('tgChatId').value.trim();
  const notifyBlocks = document.getElementById('tgNotifyBlocks').checked;
  const notifyPenalties = document.getElementById('tgNotifyPenalties').checked;

  currentUser.telegramConfig = {
    token,
    chatId,
    notifyBlocks,
    notifyPenalties
  };

  saveCurrentUser();
  alert('Настройки Telegram-бота успешно сохранены!');
}

async function sendTelegramNotification(messageText) {
  if (!currentUser || !currentUser.telegramConfig) return;
  const { token, chatId } = currentUser.telegramConfig;
  if (!token || !chatId) return;

  try {
    const isWorkerUrl = token.startsWith('http://') || token.startsWith('https://');
    let endpoint = isWorkerUrl ? token : `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = isWorkerUrl 
      ? { chatId: chatId, message: messageText }
      : { chat_id: chatId, text: messageText, parse_mode: 'HTML' };

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Telegram notification error:', err);
  }
}

async function sendTestTelegramMessage() {
  if (!currentUser) return;
  const token = document.getElementById('tgBotToken').value.trim();
  const chatId = document.getElementById('tgChatId').value.trim();

  if (!token || !chatId) {
    alert('Пожалуйста, введите токен бота (или URL воркера) и ваш Chat ID!');
    return;
  }

  try {
    const isWorkerUrl = token.startsWith('http://') || token.startsWith('https://');
    let endpoint = isWorkerUrl ? token : `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = isWorkerUrl 
      ? { chatId: chatId, message: `🔥 Привет, ${currentUser.name}! Связь с твоим Telegram-ботом на Cloudflare успешно установлена! Дисциплина OS на связи.` }
      : { chat_id: chatId, text: `🔥 <b>Привет, ${currentUser.name}!</b>\n\nСвязь с твоим Telegram-ботом на Cloudflare успешно установлена! Дисциплина OS на связи. 💪`, parse_mode: 'HTML' };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Успех! Тестовое сообщение отправлено в ваш Telegram!');
    } else {
      alert('Ошибка при отправке. Проверьте правильность токена и Chat ID.');
    }
  } catch (e) {
    alert('Не удалось отправить сообщение. Проверьте подключение к интернету или URL Cloudflare воркера.');
  }
}

function initTelegramReminderDaemon() {
  setInterval(() => {
    if (!currentUser || !currentUser.telegramConfig || !currentUser.telegramConfig.notifyBlocks) return;

    const now = new Date();
    const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (lastNotifiedMinute === currentHM) return;

    const slots = currentUser.scheduleSlots || [];
    const matchedSlot = slots.find(s => s.start === currentHM);

    if (matchedSlot) {
      lastNotifiedMinute = currentHM;
      let exText = '';
      if (matchedSlot.exercises && matchedSlot.exercises.length > 0) {
        exText = '\n\n🎯 <b>Цели блока:</b>\n' + matchedSlot.exercises.map(ex => `• ${ex.name}: ${ex.sets} подх. × ${ex.target} ${ex.unit}`).join('\n');
      }

      const msg = `🔔 <b>Время пришло: ${matchedSlot.start}!</b>\n\n<b>${matchedSlot.name}</b>\n(до ${matchedSlot.end})${exText}\n\n⚠️ <i>Штраф при пропуске: ${formatCurrencyUZS(matchedSlot.penalty || 5000)}</i>`;
      sendTelegramNotification(msg);
      playHapticSound('targetAchieved');
    }
  }, 30000); // Check every 30 seconds
}

function requestWebNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Ваш браузер не поддерживает уведомления.');
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      new Notification('Дисциплина OS', {
        body: 'Уведомления успешно включены! Напоминания будут приходить вовремя.',
        icon: 'icon-192.png'
      });
      alert('Уведомления включены!');
    } else {
      alert('Уведомления отклонены в настройках браузера.');
    }
  });
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
        closeProfileModal();
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

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Ignore audio restrictions
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
