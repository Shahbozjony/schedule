/**
 * DISCIPLINE OS - Main Application Logic v5
 * Custom Categories, Block-Level Exercises & Planks, Configurable Penalties, Full Reports & Telegram/Cloudflare Bot
 */

// Storage Keys
const APP_DATA_KEY = 'discipline_os_data_v2';
const LEGACY_USERS_KEY = 'discipline_os_users_v1';
const APP_USERS_KEY = 'discipline_users_store_v2';
const APP_SESSION_KEY = 'discipline_session_username_v2';
const APP_ACHIEVEMENTS_KEY = 'discipline_achievements_v2';
const DEFAULT_PENALTY_AMOUNT = 5000; // 5 000 сум

// State
let currentUser = null;
let selectedPenaltyDate = new Date(); // Tracks viewing month in penalty tab
let currentReportPeriod = 'all'; // 'all' | 'month' | 'week'
let lastNotifiedMinute = '';
let currentWorkoutDayFilter = 'today';
let currentAchievementFilter = 'all';

// Week days definition
const WEEK_DAYS = [
  { code: 'mon', label: 'Пн' },
  { code: 'tue', label: 'Вт' },
  { code: 'wed', label: 'Ср' },
  { code: 'thu', label: 'Чт' },
  { code: 'fri', label: 'Пт' },
  { code: 'sat', label: 'Сб' },
  { code: 'sun', label: 'Вс' }
];

// Default categories
const DEFAULT_CATEGORIES = [
  { id: 'routine', name: 'Утро / Рутина', emoji: '🌅', color: '#38bdf8' },
  { id: 'travel', name: 'Дорога / Транспорт', emoji: '🚗', color: '#f59e0b' },
  { id: 'work', name: 'Работа / Учеба', emoji: '💼', color: '#818cf8' },
  { id: 'sport', name: 'Спорт / Тренировка', emoji: '🥊', color: '#f43f5e' },
  { id: 'rest', name: 'Отдых / Обед', emoji: '🧘', color: '#34d399' },
  { id: 'sleep', name: 'Сон / Отбой', emoji: '🌙', color: '#a78bfa' }
];

// Default strict schedule
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
  { id: 's_travel1', name: '🚗 Дорога / Время в пути', start: '08:45', end: '09:00', category: 'travel', penalty: 2000, exercises: [] },
  { id: 's4', name: '🎯 Глубокая работа / Учеба (Блок 1)', start: '09:00', end: '13:00', category: 'work', penalty: 10000, exercises: [] },
  { id: 's5', name: '🥗 Обед и перезагрузка', start: '13:00', end: '14:00', category: 'rest', penalty: 2000, exercises: [] },
  { id: 's6', name: '💼 Работа, задачи и проекты (Блок 2)', start: '14:00', end: '18:00', category: 'work', penalty: 10000, exercises: [] },
  { id: 's_travel2', name: '🚗 Дорога домой / В пути', start: '18:00', end: '18:30', category: 'travel', penalty: 2000, exercises: [] },
  { id: 's7', name: '🚶 Прогулка, разгрузка, свежий воздух', start: '18:30', end: '19:00', category: 'rest', penalty: 3000, exercises: [] },
  { id: 's8', name: '🍽️ Ужин и время с семьей', start: '19:00', end: '20:30', category: 'routine', penalty: 3000, exercises: [] },
  { id: 's9', name: '📚 Чтение книги и итоги дня', start: '20:30', end: '22:00', category: 'work', penalty: 5000, exercises: [] },
  { id: 's10', name: '🌙 Подготовка ко сну, без гаджетов', start: '22:30', end: '23:00', category: 'sleep', penalty: 5000, exercises: [] }
];

// Default exercises
const DEFAULT_EXERCISES = [
  { id: 'ex_pushups', name: 'Отжимания от пола', icon: '💥', type: 'reps', target: 50, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  { id: 'ex_bench', name: 'Жим штанги лежа', icon: '🏋️', type: 'sets', target: 4, days: ['mon', 'wed', 'fri'] },
  { id: 'ex_triceps', name: 'Гантели на трицепс', icon: '💪', type: 'sets', target: 3, days: ['mon', 'wed', 'fri'] },
  { id: 'ex_plank', name: 'Планка на предплечьях', icon: '⏱️', type: 'reps', target: 120, days: ['tue', 'thu', 'sat'] }
];

// Default study & reading activities (ACCA, свободное чтение)
const DEFAULT_STUDY_ACTIVITIES = [
  { id: 'study_acca_tasks', name: 'ACCA: Разбор тем и задач', icon: '📑', type: 'reps', unit: 'задач', target: 20, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  { id: 'study_reading', name: 'Свободное чтение книг', icon: '📖', type: 'reps', unit: 'стр', target: 30, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  { id: 'study_acca_sessions', name: 'ACCA: Учебные сессии (помодоро)', icon: '⏱️', type: 'sets', unit: 'сессий', target: 4, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }
];

// Default books for reading tracker
const DEFAULT_BOOKS = [
  {
    id: 'book_acca',
    title: 'ACCA Study Text (Financial Reporting)',
    author: 'BPP / Kaplan',
    totalPages: 480,
    basePage: 60,
    currentPage: 60,
    dailyTarget: 20,
    status: 'reading'
  },
  {
    id: 'book_habits',
    title: 'Атомные привычки',
    author: 'Джеймс Клир',
    totalPages: 320,
    basePage: 85,
    currentPage: 85,
    dailyTarget: 25,
    status: 'reading'
  }
];

// Initialize application on page load
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  initAchievements();
  initUserData();
  registerServiceWorker();
});

/* =========================================================
   USER DATA STORAGE & AUTHENTICATION (ЛОГИН И ПАРОЛЬ)
   ========================================================= */

function getAllUsers() {
  try {
    const raw = localStorage.getItem(APP_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading users map:', e);
  }
  return {};
}

function saveAllUsers(usersMap) {
  try {
    localStorage.setItem(APP_USERS_KEY, JSON.stringify(usersMap));
  } catch (e) {
    console.error('Error saving users map:', e);
  }
}

function createDefaultUserProfile(name, username, password) {
  const todayKey = getTodayDateKey();
  return {
    name: name || 'Шахбоз',
    username: (username || 'shahbozjony').toLowerCase(),
    password: password || 'Schedule2004',
    createdAt: new Date().toISOString(),
    streak: 0,
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    scheduleSlots: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_SLOTS)),
    scheduleCompletions: {},
    workoutLogs: {
      [todayKey]: { status: 'pending', penalty: 0, exercises: {} }
    },
    exercises: JSON.parse(JSON.stringify(DEFAULT_EXERCISES)),
    studyActivities: JSON.parse(JSON.stringify(DEFAULT_STUDY_ACTIVITIES)),
    studyLogs: {
      [todayKey]: { status: 'pending', activities: {}, scheduleDone: {}, scheduleSets: {}, bookPages: {} }
    },
    books: JSON.parse(JSON.stringify(DEFAULT_BOOKS))
  };
}

function initUserData() {
  let users = getAllUsers();

  // If users map is empty, see if we have existing currentUser in APP_DATA_KEY or legacy
  let existingUser = null;
  try {
    const raw = localStorage.getItem(APP_DATA_KEY);
    if (raw) existingUser = JSON.parse(raw);
  } catch (e) {}

  if (!existingUser) {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_USERS_KEY);
      if (legacyRaw) {
        const legacyUsers = JSON.parse(legacyRaw);
        const firstKey = Object.keys(legacyUsers)[0];
        if (firstKey && legacyUsers[firstKey]) existingUser = legacyUsers[firstKey];
      }
    } catch (e) {}
  }

  // Always ensure shahbozjony account is configured with Schedule2004
  if (!users['shahbozjony']) {
    const defaultUser = users['shahboz'] || existingUser || createDefaultUserProfile('Шахбоз', 'shahbozjony', 'Schedule2004');
    defaultUser.username = 'shahbozjony';
    defaultUser.password = 'Schedule2004';
    if (!defaultUser.name) defaultUser.name = 'Шахбоз';
    users['shahbozjony'] = defaultUser;
    saveAllUsers(users);
  } else {
    // If password was default '1234' or missing, update to 'Schedule2004'
    if (users['shahbozjony'].password === '1234' || !users['shahbozjony'].password) {
      users['shahbozjony'].password = 'Schedule2004';
      saveAllUsers(users);
    }
  }

  // Check active session
  const activeSession = localStorage.getItem(APP_SESSION_KEY);
  if (activeSession && users[activeSession.toLowerCase()]) {
    currentUser = users[activeSession.toLowerCase()];
    ensureUserDefaults();
    showMainScreen();
  } else {
    // If no active session, show auth screen
    showAuthScreen();
  }
}

function ensureUserDefaults() {
  if (!currentUser) return;
  if (!currentUser.name) currentUser.name = 'Шахбоз';
  if (!currentUser.categories || currentUser.categories.length === 0) {
    currentUser.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  } else {
    const hasTravel = currentUser.categories.some(c => c.id === 'travel' || c.name.toLowerCase().includes('дорог'));
    if (!hasTravel) {
      currentUser.categories.splice(1, 0, { id: 'travel', name: 'Дорога / Транспорт', emoji: '🚗', color: '#f59e0b' });
    }
  }
  if (!currentUser.scheduleSlots) {
    currentUser.scheduleSlots = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_SLOTS));
  }
  currentUser.scheduleSlots.forEach(slot => {
    if (slot.penalty === undefined) slot.penalty = DEFAULT_PENALTY_AMOUNT;
    if (!slot.exercises) slot.exercises = [];
  });
  if (!currentUser.telegramConfig) {
    currentUser.telegramConfig = { token: '', chatId: '', notifyBlocks: true, notifyPenalties: true };
  }

  // Clear penalties for today and all past days as requested
  const todayKey = getTodayDateKey();
  if (!currentUser.penaltiesClearedUntil || currentUser.penaltiesClearedUntil < todayKey) {
    currentUser.penaltiesClearedUntil = todayKey;
    if (currentUser.workoutLogs) {
      Object.keys(currentUser.workoutLogs).forEach(date => {
        if (date <= todayKey && currentUser.workoutLogs[date]) {
          currentUser.workoutLogs[date].penalty = 0;
        }
      });
    }
  }

  // Ensure exercises have valid days
  if (!currentUser.exercises || currentUser.exercises.length === 0) {
    currentUser.exercises = JSON.parse(JSON.stringify(DEFAULT_EXERCISES));
  }
  currentUser.exercises.forEach(ex => {
    if (!ex.days || !Array.isArray(ex.days) || ex.days.length === 0) {
      ex.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    }
  });

  // Ensure study & reading activities (ACCA, Чтение)
  if (!currentUser.studyActivities || currentUser.studyActivities.length === 0) {
    currentUser.studyActivities = JSON.parse(JSON.stringify(DEFAULT_STUDY_ACTIVITIES));
  }
  currentUser.studyActivities.forEach(st => {
    if (!st.days || !Array.isArray(st.days) || st.days.length === 0) {
      st.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    }
    if (!st.unit) st.unit = (st.type === 'sets' ? 'сессий' : 'задач');
  });

  if (!currentUser.studyLogs) {
    currentUser.studyLogs = {};
  }
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = {
      status: 'pending',
      activities: {},
      scheduleDone: {},
      scheduleSets: {}
    };
  }

  // Ensure work/study slots in schedule have study exercises
  if (currentUser.scheduleSlots) {
    const studySlot = currentUser.scheduleSlots.find(s => s.category === 'work' && (!s.exercises || s.exercises.length === 0));
    if (studySlot) {
      studySlot.exercises = [
        { name: 'ACCA: Разбор тем и задач', sets: 4, target: 10, unit: 'задач' }
      ];
    }
    const readingSlot = currentUser.scheduleSlots.find(s => (s.id === 's9' || (s.name && s.name.toLowerCase().includes('чтение'))) && (!s.exercises || s.exercises.length === 0));
    if (readingSlot) {
      readingSlot.exercises = [
        { name: 'Свободное чтение книг', sets: 1, target: 30, unit: 'стр' }
      ];
    }
  }

  // Ensure books for reading tracker
  if (!currentUser.books || currentUser.books.length === 0) {
    currentUser.books = JSON.parse(JSON.stringify(DEFAULT_BOOKS));
  }
  currentUser.books.forEach(b => {
    if (b.currentPage === undefined) b.currentPage = 0;
    if (b.basePage === undefined) b.basePage = b.currentPage;
    if (b.dailyTarget === undefined) b.dailyTarget = 25;
    if (!b.status) b.status = 'reading';
  });

  initUserExercises();
  initUserStudyActivities();
  saveCurrentUser();
}

function saveCurrentUser() {
  if (!currentUser) return;
  try {
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(currentUser));
    const users = getAllUsers();
    if (currentUser.username) {
      users[currentUser.username.toLowerCase()] = currentUser;
      saveAllUsers(users);
    }
  } catch (e) {
    console.error('Error saving data:', e);
  }
  checkAutomaticAchievements();
  updateTrophyTopBadge();
}

function confirmResetData() {
  if (confirm('ВНИМАНИЕ!\n\nСбросить расписание, упражнения и отметки к начальным настройкам?')) {
    localStorage.removeItem(APP_DATA_KEY);
    localStorage.removeItem(LEGACY_USERS_KEY);
    localStorage.removeItem('discipline_os_current_user_v1');
    currentUser = null;
    initUserData();
    showMainScreen();
    closeProfileModal();
    alert('Настройки успешно сброшены к начальным!');
  }
}

function showAuthScreen() {
  const authEl = document.getElementById('authScreen');
  const mainEl = document.getElementById('mainScreen');
  if (authEl) authEl.classList.remove('hidden');
  if (mainEl) mainEl.classList.add('hidden');
  const userInp = document.getElementById('loginUsername');
  if (userInp) userInp.value = 'shahbozjony';
  switchAuthTab('login');
}

function showMainScreen() {
  const authEl = document.getElementById('authScreen');
  const mainEl = document.getElementById('mainScreen');
  if (authEl) authEl.classList.add('hidden');
  if (mainEl) mainEl.classList.remove('hidden');

  try {
    ensureUserDefaults();
    renderUserProfile();
    renderSchedule();
    renderPushups();
    renderStudy();
    renderPenalties();
    renderReport();
    checkAutomaticAchievements();
    updateTrophyTopBadge();
  } catch (err) {
    console.error('Error in showMainScreen:', err);
  }
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById('tabBtnLogin');
  const btnReg = document.getElementById('tabBtnRegister');
  const formLogin = document.getElementById('loginForm');
  const formReg = document.getElementById('registerForm');
  const errLogin = document.getElementById('loginError');
  const errReg = document.getElementById('regError');

  if (errLogin) errLogin.classList.add('hidden');
  if (errReg) errReg.classList.add('hidden');

  if (tab === 'login') {
    if (btnLogin) btnLogin.classList.add('active');
    if (btnReg) btnReg.classList.remove('active');
    if (formLogin) formLogin.classList.remove('hidden');
    if (formReg) formReg.classList.add('hidden');
  } else {
    if (btnReg) btnReg.classList.add('active');
    if (btnLogin) btnLogin.classList.remove('active');
    if (formReg) formReg.classList.remove('hidden');
    if (formLogin) formLogin.classList.add('hidden');
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = (document.getElementById('loginUsername').value || '').trim().toLowerCase();
  const passwordInput = (document.getElementById('loginPassword').value || '').trim();
  const errEl = document.getElementById('loginError');

  const users = getAllUsers();
  let user = users[usernameInput];

  // Aliases for Shahboz: allow both shahbozjony and shahboz
  if (!user) {
    if (usernameInput === 'shahbozjony' && users['shahboz']) user = users['shahboz'];
    if (usernameInput === 'shahboz' && users['shahbozjony']) user = users['shahbozjony'];
  }

  // Fallback if not registered in usersMap
  if (!user && (usernameInput === 'shahbozjony' || usernameInput === 'shahboz')) {
    user = currentUser || createDefaultUserProfile('Шахбоз', 'shahbozjony', 'Schedule2004');
    users['shahbozjony'] = user;
    saveAllUsers(users);
  }

  if (!user) {
    if (errEl) {
      errEl.textContent = 'Пользователь с таким логином не найден. Проверьте логин или зарегистрируйтесь во вкладке «Регистрация».';
      errEl.classList.remove('hidden');
    }
    return;
  }

  // Password validation (support Schedule2004, schedule2004, or legacy 1234)
  const isShahboz = (usernameInput === 'shahbozjony' || usernameInput === 'shahboz' || user.username === 'shahbozjony' || user.username === 'shahboz');
  const expectedPass = user.password || 'Schedule2004';

  const isValidPass = (passwordInput === expectedPass) ||
                      (passwordInput.toLowerCase() === expectedPass.toLowerCase()) ||
                      (isShahboz && (
                        passwordInput === 'Schedule2004' || 
                        passwordInput.toLowerCase() === 'schedule2004' || 
                        passwordInput === '1234'
                      ));

  if (!isValidPass) {
    if (errEl) {
      errEl.textContent = 'Неверный пароль! Попробуйте снова или проверьте регистр букв.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  // Update credentials to canonical Schedule2004
  if (isShahboz) {
    user.username = 'shahbozjony';
    user.password = 'Schedule2004';
    users['shahbozjony'] = user;
    saveAllUsers(users);
  }

  if (errEl) errEl.classList.add('hidden');
  currentUser = user;
  localStorage.setItem(APP_SESSION_KEY, currentUser.username);
  localStorage.setItem(APP_DATA_KEY, JSON.stringify(currentUser));
  showMainScreen();
}

function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = (document.getElementById('regName').value || '').trim();
  const username = (document.getElementById('regUsername').value || '').trim().toLowerCase();
  const pass = document.getElementById('regPassword').value;
  const confirmPass = document.getElementById('regConfirmPassword').value;
  const errEl = document.getElementById('regError');

  if (pass !== confirmPass) {
    if (errEl) {
      errEl.textContent = '⚠️ Введенные пароли не совпадают! Введите одинаковый пароль дважды для подтверждения.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (pass.length < 3) {
    if (errEl) {
      errEl.textContent = 'Пароль должен содержать минимум 3 символа.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  const users = getAllUsers();
  if (users[username]) {
    if (errEl) {
      errEl.textContent = 'Этот логин уже занят! Выберите другой логин.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  const newUser = createDefaultUserProfile(name, username, pass);
  users[username] = newUser;
  saveAllUsers(users);

  currentUser = newUser;
  localStorage.setItem(APP_SESSION_KEY, currentUser.username);
  localStorage.setItem(APP_DATA_KEY, JSON.stringify(currentUser));
  if (errEl) errEl.classList.add('hidden');
  showMainScreen();
}

function handleProfileSecuritySave(e) {
  e.preventDefault();
  if (!currentUser) return;

  const newUsername = (document.getElementById('profileEditUsername').value || '').trim().toLowerCase();
  const newDisplayName = (document.getElementById('profileEditDisplayName').value || '').trim();
  const newPass = document.getElementById('profileNewPass').value;
  const confirmPass = document.getElementById('profileConfirmPass').value;
  const errEl = document.getElementById('profileSecurityError');

  if (errEl) errEl.classList.add('hidden');

  // Password confirmation check
  if (newPass || confirmPass) {
    if (newPass !== confirmPass) {
      if (errEl) {
        errEl.textContent = '⚠️ Введенные пароли не совпадают! Введите одинаковый пароль дважды для подтверждения.';
        errEl.classList.remove('hidden');
      }
      return;
    }
    if (newPass.length < 3) {
      if (errEl) {
        errEl.textContent = '⚠️ Пароль должен содержать как минимум 3 символа.';
        errEl.classList.remove('hidden');
      }
      return;
    }
    currentUser.password = newPass;
  }

  // Username change
  const oldUsername = (currentUser.username || '').toLowerCase();
  const users = getAllUsers();

  if (newUsername && newUsername !== oldUsername) {
    if (users[newUsername]) {
      if (errEl) {
        errEl.textContent = '⚠️ Этот логин уже занят другим пользователем!';
        errEl.classList.remove('hidden');
      }
      return;
    }
    delete users[oldUsername];
    currentUser.username = newUsername;
    localStorage.setItem(APP_SESSION_KEY, newUsername);
  }

  if (newDisplayName) {
    currentUser.name = newDisplayName;
  }

  users[currentUser.username.toLowerCase()] = currentUser;
  saveAllUsers(users);
  saveCurrentUser();

  // Reset inputs
  document.getElementById('profileNewPass').value = '';
  document.getElementById('profileConfirmPass').value = '';

  renderUserProfile();
  alert('✅ Данные аккаунта, логин и пароль успешно сохранены!');
  closeProfileModal();
}

function handleLogout() {
  if (confirm('Вы действительно хотите выйти из аккаунта?')) {
    localStorage.removeItem(APP_SESSION_KEY);
    closeProfileModal();
    currentUser = null;
    showAuthScreen();
  }
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
  const views = ['viewSchedule', 'viewStudy', 'viewPushups', 'viewPenalties', 'viewReport'];
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
  if (viewId === 'viewStudy') renderStudy();
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

  // Populate Security & Account inputs
  const editUserEl = document.getElementById('profileEditUsername');
  if (editUserEl) editUserEl.value = currentUser.username || '';
  const editNameEl = document.getElementById('profileEditDisplayName');
  if (editNameEl) editNameEl.value = currentUser.name || '';
  const passEl = document.getElementById('profileNewPass');
  if (passEl) passEl.value = '';
  const confirmEl = document.getElementById('profileConfirmPass');
  if (confirmEl) confirmEl.value = '';
  const secErr = document.getElementById('profileSecurityError');
  if (secErr) secErr.classList.add('hidden');
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

  const userExercises = (currentUser && currentUser.exercises) || DEFAULT_EXERCISES;
  const userStudy = (currentUser && currentUser.studyActivities) || DEFAULT_STUDY_ACTIVITIES;

  let optionsHtml = `<option value="">-- Выберите из базы --</option>`;
  let matched = false;

  const userBooks = (currentUser && currentUser.books) || DEFAULT_BOOKS;
  if (userBooks.length > 0) {
    optionsHtml += `<optgroup label="📖 Мои книги">`;
    userBooks.forEach(b => {
      const isSelected = b.title === name;
      if (isSelected) matched = true;
      optionsHtml += `<option value="${escapeHtml(b.title)}" data-kind="book" ${isSelected ? 'selected' : ''}>📖 ${escapeHtml(b.title)}</option>`;
    });
    optionsHtml += `</optgroup>`;
  }

  optionsHtml += `<optgroup label="📚 Учёба и чтение">`;
  userStudy.forEach(st => {
    const isSelected = st.name === name;
    if (isSelected) matched = true;
    optionsHtml += `<option value="${escapeHtml(st.name)}" data-kind="study" ${isSelected ? 'selected' : ''}>${st.icon || '📚'} ${escapeHtml(st.name)}</option>`;
  });
  optionsHtml += `</optgroup>`;

  optionsHtml += `<optgroup label="💪 Тренировка и спорт">`;
  userExercises.forEach(ex => {
    const isSelected = ex.name === name;
    if (isSelected) matched = true;
    optionsHtml += `<option value="${escapeHtml(ex.name)}" data-kind="sport" ${isSelected ? 'selected' : ''}>${ex.icon || '🏋️'} ${escapeHtml(ex.name)}</option>`;
  });
  optionsHtml += `</optgroup>`;

  if (name && !matched) {
    optionsHtml += `<option value="${escapeHtml(name)}" selected>✏️ ${escapeHtml(name)}</option>`;
  }

  optionsHtml += `<option value="__new__">➕ Новое упражнение/предмет...</option>`;
  optionsHtml += `<option value="__custom__">✏️ Ввести другое вручную...</option>`;

  row.innerHTML = `
    <select class="ex-name-select" onchange="onSlotExerciseSelectChanged(this)" title="Выберите упражнение или предмет из базы">
      ${optionsHtml}
    </select>
    <input type="number" placeholder="Подх." min="1" max="100" value="${sets}" title="Количество подходов / сессий" class="ex-sets-input">
    <input type="number" placeholder="Цель" min="1" max="5000" value="${target}" title="Повторений, задач или страниц" class="ex-target-input">
    <select class="ex-unit-input" title="Единица измерения">
      <option value="задач" ${unit === 'задач' ? 'selected' : ''}>задач</option>
      <option value="стр" ${unit === 'стр' ? 'selected' : ''}>стр</option>
      <option value="мин" ${unit === 'мин' ? 'selected' : ''}>мин</option>
      <option value="раз" ${unit === 'раз' ? 'selected' : ''}>раз</option>
      <option value="сек" ${unit === 'сек' ? 'selected' : ''}>сек</option>
      <option value="сессий" ${unit === 'сессий' ? 'selected' : ''}>сессий</option>
      <option value="подх." ${unit === 'подх.' ? 'selected' : ''}>подх.</option>
    </select>
    <button type="button" class="slot-ex-delete-btn" onclick="this.parentElement.remove()" title="Удалить строку">✕</button>
  `;
  container.appendChild(row);
}

function onSlotExerciseSelectChanged(selectEl) {
  const val = selectEl.value;
  const row = selectEl.closest('.slot-ex-row');
  if (!row) return;

  if (val === '__custom__') {
    const customName = prompt('Введите название упражнения или предмета:');
    if (customName && customName.trim()) {
      const opt = document.createElement('option');
      opt.value = customName.trim();
      opt.textContent = '✏️ ' + customName.trim();
      opt.selected = true;
      selectEl.insertBefore(opt, selectEl.lastElementChild.previousElementSibling);
    } else {
      selectEl.value = '';
    }
    return;
  }

  if (val === '__new__') {
    const newName = prompt('Добавить в базу.\n\nВведите название (например: ACCA: Налоги или Жим гантелей):');
    if (newName && newName.trim()) {
      const trimmedName = newName.trim();
      const isStudy = trimmedName.toLowerCase().includes('acca') || trimmedName.toLowerCase().includes('чтени') || trimmedName.toLowerCase().includes('книг') || trimmedName.toLowerCase().includes('учеб');
      if (isStudy) {
        const newSt = {
          id: 'study_' + Date.now(),
          name: trimmedName,
          icon: trimmedName.toLowerCase().includes('книг') || trimmedName.toLowerCase().includes('чтен') ? '📖' : '📑',
          type: 'reps',
          unit: trimmedName.toLowerCase().includes('книг') || trimmedName.toLowerCase().includes('чтен') ? 'стр' : 'задач',
          target: 20,
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        };
        if (!currentUser.studyActivities) currentUser.studyActivities = [];
        currentUser.studyActivities.push(newSt);
        saveCurrentUser();
        renderStudy();
      } else {
        const isPlank = trimmedName.toLowerCase().includes('планк') || trimmedName.toLowerCase().includes('удержан');
        const newEx = {
          id: 'ex_' + Date.now(),
          name: trimmedName,
          icon: isPlank ? '⏱️' : '🏋️',
          type: isPlank ? 'reps' : 'sets',
          target: isPlank ? 60 : 4,
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        };
        if (!currentUser.exercises) currentUser.exercises = [];
        currentUser.exercises.push(newEx);
        saveCurrentUser();
        renderPushups();
      }
      renderReport();

      const opt = document.createElement('option');
      opt.value = trimmedName;
      opt.textContent = (isStudy ? '📚 ' : '🏋️ ') + trimmedName;
      opt.selected = true;
      selectEl.insertBefore(opt, selectEl.lastElementChild.previousElementSibling);
    } else {
      selectEl.value = '';
    }
    return;
  }

  // Check in books first
  if (currentUser && currentUser.books) {
    const matchedBook = currentUser.books.find(b => b.title === val);
    if (matchedBook) {
      const setsInput = row.querySelector('.ex-sets-input');
      const targetInput = row.querySelector('.ex-target-input');
      const unitSelect = row.querySelector('.ex-unit-input');
      if (setsInput) setsInput.value = 1;
      if (targetInput) targetInput.value = matchedBook.dailyTarget || 20;
      if (unitSelect) unitSelect.value = 'стр';
      return;
    }
  }

  // Check in study activities first
  if (currentUser && currentUser.studyActivities) {
    const matchedStudy = currentUser.studyActivities.find(s => s.name === val);
    if (matchedStudy) {
      const setsInput = row.querySelector('.ex-sets-input');
      const targetInput = row.querySelector('.ex-target-input');
      const unitSelect = row.querySelector('.ex-unit-input');
      if (matchedStudy.type === 'sets') {
        if (setsInput) setsInput.value = matchedStudy.target || 4;
        if (targetInput) targetInput.value = 45;
        if (unitSelect) unitSelect.value = 'мин';
      } else {
        if (setsInput) setsInput.value = matchedStudy.name.includes('ACCA') ? 4 : 1;
        if (targetInput) targetInput.value = matchedStudy.name.includes('ACCA') ? 10 : (matchedStudy.target || 20);
        if (unitSelect) unitSelect.value = matchedStudy.unit || 'задач';
      }
      return;
    }
  }

  if (currentUser && currentUser.exercises) {
    const matched = currentUser.exercises.find(e => e.name === val);
    if (matched) {
      const setsInput = row.querySelector('.ex-sets-input');
      const targetInput = row.querySelector('.ex-target-input');
      const unitSelect = row.querySelector('.ex-unit-input');
      const isPlank = matched.id.includes('plank') || matched.name.toLowerCase().includes('планк');

      if (matched.type === 'sets') {
        if (setsInput) setsInput.value = matched.target || 4;
        if (targetInput) targetInput.value = 10;
        if (unitSelect) unitSelect.value = 'раз';
      } else {
        if (setsInput) setsInput.value = isPlank ? 3 : 1;
        if (targetInput) targetInput.value = matched.target || 50;
        if (unitSelect) unitSelect.value = isPlank ? 'сек' : 'раз';
      }
    }
  }
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
    const nameEl = r.querySelector('.ex-name-select') || r.querySelector('.ex-name-input');
    const exName = nameEl ? nameEl.value.trim() : '';
    const sets = parseInt(r.querySelector('.ex-sets-input').value, 10) || 1;
    const target = parseInt(r.querySelector('.ex-target-input').value, 10) || 10;
    const unit = r.querySelector('.ex-unit-input').value || 'раз';
    if (exName && exName !== '__new__' && exName !== '__custom__') {
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
   WORKOUT TAB LOGIC (Multi-exercise Tracker & Day Splits)
   ========================================================= */

function initUserExercises() {
  if (!currentUser) return;
  if (!currentUser.exercises || currentUser.exercises.length === 0) {
    currentUser.exercises = JSON.parse(JSON.stringify(DEFAULT_EXERCISES));
  }
  
  // Ensure all exercises have a days array
  currentUser.exercises.forEach(ex => {
    if (!ex.days || !Array.isArray(ex.days) || ex.days.length === 0) {
      ex.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    }
  });

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
  if (!currentUser.workoutLogs[todayKey].exercises) {
    currentUser.workoutLogs[todayKey].exercises = {};
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

function setWorkoutDayFilter(filterCode) {
  currentWorkoutDayFilter = filterCode;
  document.querySelectorAll('.day-filter-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`filterDay_${filterCode}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderPushups();
}

function toggleExerciseDay(exId, dayCode) {
  if (!currentUser) return;
  const ex = currentUser.exercises.find(e => e.id === exId);
  if (!ex) return;

  if (!ex.days) ex.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const idx = ex.days.indexOf(dayCode);
  if (idx > -1) {
    if (ex.days.length === 1) {
      alert('Упражнение должно быть назначено хотя бы на один день!');
      return;
    }
    ex.days.splice(idx, 1);
  } else {
    ex.days.push(dayCode);
  }

  saveCurrentUser();
  renderPushups();
}

function renderPushups() {
  if (!currentUser) return;
  initUserExercises();

  const todayKey = getTodayDateKey();
  const todayLog = currentUser.workoutLogs[todayKey];
  const allExercises = currentUser.exercises;

  const container = document.getElementById('exercisesContainer');
  if (!container) return;
  container.innerHTML = '';

  // Determine current day code
  const dayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayCode = dayMap[dayIndex];

  // Filter exercises depending on current filter
  let visibleExercises = allExercises;
  if (currentWorkoutDayFilter === 'today') {
    visibleExercises = allExercises.filter(ex => ex.days && ex.days.includes(todayCode));
  } else if (currentWorkoutDayFilter !== 'all') {
    visibleExercises = allExercises.filter(ex => ex.days && ex.days.includes(currentWorkoutDayFilter));
  }

  let completedCount = 0;

  if (visibleExercises.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 16px; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border);">
        <div style="font-size: 32px; margin-bottom: 8px;">🌴</div>
        <div style="font-size: 15px; font-weight: 700;">На этот день нет упражнений</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
          Переключитесь на вкладку «Все» вверху и нажмите на дни недели, чтобы назначить упражнения на этот день.
        </div>
      </div>
    `;
  }

  visibleExercises.forEach(ex => {
    const exData = todayLog.exercises[ex.id] || (ex.type === 'reps' ? { done: 0, completed: false } : { sets: [], completed: false });
    
    let isCompleted = exData.completed;
    if (ex.type === 'reps' && exData.done >= ex.target) isCompleted = true;
    if (ex.type === 'sets' && exData.sets && exData.sets.length >= ex.target) isCompleted = true;
    if (isCompleted) completedCount++;

    const card = document.createElement('div');
    card.className = `exercise-card ${isCompleted ? 'completed' : ''}`;

    // Day chips HTML
    const dayChipsHtml = WEEK_DAYS.map(d => {
      const isDayActive = ex.days && ex.days.includes(d.code);
      return `<span class="ex-day-chip ${isDayActive ? 'active' : ''}" onclick="toggleExerciseDay('${ex.id}', '${d.code}')">${d.label}</span>`;
    }).join('');

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
            <div class="ex-days-row">
              <span class="ex-days-label">Дни:</span>
              ${dayChipsHtml}
            </div>
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
  if (exDoneEl) exDoneEl.textContent = `${completedCount}/${visibleExercises.length}`;

  const penaltyStat = document.getElementById('todayPenaltyStatus');
  const verdictBox = document.getElementById('dayVerdictBox');

  const isAllDone = visibleExercises.length > 0 && completedCount === visibleExercises.length;

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
    const isTodayWaived = currentUser.penaltiesClearedUntil && (todayKey <= currentUser.penaltiesClearedUntil);
    todayLog.penalty = isTodayWaived ? 0 : 5000;
    if (penaltyStat) {
      penaltyStat.textContent = isTodayWaived ? '0 сум' : '5 000 сум';
      penaltyStat.style.color = isTodayWaived ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    if (verdictBox) {
      verdictBox.className = isTodayWaived ? 'day-verdict-box' : 'day-verdict-box verdict-penalty';
      verdictBox.innerHTML = `
        <div>⚠️ ТРЕНИРОВКА В ПРОЦЕССЕ (${completedCount}/${visibleExercises.length})</div>
        <div style="font-size: 12px; font-weight: 500; opacity: 0.9;">
          ${isTodayWaived 
            ? '✓ Штрафы за сегодня списаны (0 сум). Выполняй упражнения в удовольствие!' 
            : 'Закрой упражнения плана до полуночи, иначе штраф составит <b>5 000 сум</b>!'}
        </div>
      `;
    }
  }

  saveCurrentUser();
  renderWorkoutHistory();
  renderScheduleWorkoutComparison();
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
  document.querySelectorAll('#newExerciseDaysGrid input[type="checkbox"]').forEach(cb => {
    cb.checked = true;
  });
  document.getElementById('exerciseModal').classList.remove('hidden');
}

function openExerciseModal() {
  openAddExerciseModal();
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

  const days = [];
  document.querySelectorAll('#newExerciseDaysGrid input:checked').forEach(cb => {
    days.push(cb.value);
  });

  const isPlank = name.toLowerCase().includes('планк') || name.toLowerCase().includes('удержан');
  const icons = { sets: '🏋️', reps: isPlank ? '⏱️' : '💥' };
  const newEx = {
    id: 'ex_' + Date.now(),
    name,
    icon: icons[type] || '💪',
    type,
    target,
    days: days.length > 0 ? days : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
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

function clearAllPenalties(showConfirm = true) {
  if (showConfirm && !confirm('Списать все штрафы за предыдущие дни и за сегодня?\n\nБаланс штрафов станет 0 сум.')) {
    return;
  }
  if (!currentUser) return;

  const todayKey = getTodayDateKey();
  currentUser.penaltiesClearedUntil = todayKey;

  // Clear workout penalty for today and all recorded dates
  if (currentUser.workoutLogs) {
    Object.keys(currentUser.workoutLogs).forEach(date => {
      if (date <= todayKey && currentUser.workoutLogs[date]) {
        currentUser.workoutLogs[date].penalty = 0;
      }
    });
  }

  saveCurrentUser();
  renderPenalties();
  renderPushups();
  renderReport();
  if (showConfirm) {
    alert('Все штрафы успешно списаны! Текущий баланс штрафов: 0 сум 🎉');
  }
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

  const daysListEl = document.getElementById('monthDaysList');
  daysListEl.innerHTML = '';

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // If viewing a future month (e.g. November when today is October):
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    document.getElementById('monthlyPenaltyTotal').textContent = '0 сум';
    document.getElementById('monthSuccessDays').textContent = '0';
    document.getElementById('monthMissedDays').textContent = '0';
    document.getElementById('monthSuccessRate').textContent = '—';
    daysListEl.innerHTML = '<div style="padding: 30px 16px; text-align: center; color: var(--text-dim); font-size: 14px;">📅 Этот месяц еще не наступил. Штрафов нет!</div>';
    return;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = currentYear === year && currentMonth === month;
  const maxDayToCheck = isCurrentMonth ? today.getDate() : daysInMonth;

  const createdDate = new Date(currentUser.createdAt || Date.now());
  const createdYear = createdDate.getFullYear();
  const createdMonth = createdDate.getMonth();
  const createdDay = createdDate.getDate();

  let totalMonthPenalty = 0;
  let successDays = 0;
  let missedDays = 0;

  const slots = currentUser.scheduleSlots || [];

  for (let day = 1; day <= maxDayToCheck; day++) {
    // Skip days before account was created
    if (year === createdYear && month === createdMonth && day < createdDay) {
      continue;
    }

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const completedList = (currentUser.scheduleCompletions && currentUser.scheduleCompletions[dateKey]) || [];
    const isToday = isCurrentMonth && day === today.getDate();
    const isWaived = currentUser.penaltiesClearedUntil && (dateKey <= currentUser.penaltiesClearedUntil);

    if (isWaived) {
      successDays++;
      const row = document.createElement('div');
      row.className = 'month-day-row success';
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <span>${day} ${monthNames[month]} ${isToday ? '(Сегодня)' : ''}</span>
          <span class="text-green">✓ Штрафы списаны (0 сум)</span>
        </div>
      `;
      daysListEl.prepend(row);
      continue;
    }

    // Check which slots were missed for this day
    const missedSlots = [];
    let dayPenaltySum = 0;

    slots.forEach(s => {
      if (!completedList.includes(s.id)) {
        if (isToday) {
          const nowMins = today.getHours() * 60 + today.getMinutes();
          if (nowMins > timeToMinutes(s.end)) {
            missedSlots.push(s);
            dayPenaltySum += (s.penalty !== undefined ? s.penalty : DEFAULT_PENALTY_AMOUNT);
          }
        } else {
          missedSlots.push(s);
          dayPenaltySum += (s.penalty !== undefined ? s.penalty : DEFAULT_PENALTY_AMOUNT);
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

  const customBox = document.getElementById('customDateRangeBox');
  if (customBox) {
    if (period === 'custom') {
      customBox.classList.remove('hidden');
      const startInput = document.getElementById('reportStartDate');
      const endInput = document.getElementById('reportEndDate');
      const todayKey = getTodayDateKey();
      if (!endInput.value) endInput.value = todayKey;
      if (!startInput.value) {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        startInput.value = `${y}-${m}-${day}`;
      }
    } else {
      customBox.classList.add('hidden');
    }
  }

  const btnMap = {
    all: 'btnPeriodAll',
    month: 'btnPeriodMonth',
    week: 'btnPeriodWeek',
    today: 'btnPeriodToday',
    yesterday: 'btnPeriodYesterday',
    custom: 'btnPeriodCustom'
  };
  const activeBtn = document.getElementById(btnMap[period]);
  if (activeBtn) activeBtn.classList.add('active');

  const todayKey = getTodayDateKey();
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayKey = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

  const descEl = document.getElementById('reportPeriodDesc');
  if (descEl) {
    if (period === 'all') descEl.textContent = 'Показатели за всё время ведения системы';
    if (period === 'month') descEl.textContent = 'Показатели за текущий календарный месяц';
    if (period === 'week') descEl.textContent = 'Показатели за последние 7 дней';
    if (period === 'today') descEl.textContent = `Показатели за сегодня (${todayKey})`;
    if (period === 'yesterday') descEl.textContent = `Показатели за вчерашний день (${yesterdayKey})`;
    if (period === 'custom') {
      const s = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
      const e = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';
      descEl.textContent = (s && e) ? `Показатели за период: с ${s} по ${e}` : 'Выберите диапазон дат в календаре выше';
    }
  }

  renderReport();
}

function onCustomDateRangeChanged() {
  const s = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
  const e = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';
  const descEl = document.getElementById('reportPeriodDesc');
  if (descEl && s && e) {
    descEl.textContent = `Показатели за период: с ${s} по ${e}`;
  }
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

  const todayKey = getTodayDateKey();
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayKey = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

  const customStart = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
  const customEnd = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';

  // Filter dates
  const allDates = Object.keys(completions);
  Object.keys(workoutLogs).forEach(d => { if (!allDates.includes(d)) allDates.push(d); });
  if (!allDates.includes(todayKey)) allDates.push(todayKey);
  if (!allDates.includes(yesterdayKey)) allDates.push(yesterdayKey);

  allDates.forEach(dateStr => {
    const d = new Date(dateStr);
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (currentReportPeriod === 'today') {
      if (dateStr !== todayKey) return;
    } else if (currentReportPeriod === 'yesterday') {
      if (dateStr !== yesterdayKey) return;
    } else if (currentReportPeriod === 'week') {
      if (diffDays > 7) return;
    } else if (currentReportPeriod === 'month') {
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
    } else if (currentReportPeriod === 'custom') {
      if (customStart && dateStr < customStart) return;
      if (customEnd && dateStr > customEnd) return;
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
    if (!currentUser.penaltiesClearedUntil || dateStr > currentUser.penaltiesClearedUntil) {
      slots.forEach(s => {
        if (!dayCompletedSlotIds.includes(s.id)) {
          if (diffDays > 0) {
            totalPenalty += (s.penalty || DEFAULT_PENALTY_AMOUNT);
          }
        }
      });
    }
  });

  // Update Big Cards
  document.getElementById('repTotalReps').textContent = totalReps;
  document.getElementById('repTotalPlank').textContent = totalPlankSecs > 60 
    ? `${Math.floor(totalPlankSecs / 60)} мин ${totalPlankSecs % 60} сек`
    : `${totalPlankSecs} сек`;
  document.getElementById('repTotalBlocksDone').textContent = totalBlocksDone;
  document.getElementById('repTotalPenalty').textContent = formatCurrencyUZS(totalPenalty);

  // Render Today's Schedule Workout Execution vs Plan
  renderTodayWorkoutReport();
  renderTodayStudyReport();

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

  // Render Section 3: Exercise Volume for Period
  const exListEl = document.getElementById('exerciseReportList');
  if (exListEl && currentUser.exercises) {
    exListEl.innerHTML = '';
    currentUser.exercises.forEach(ex => {
      const row = document.createElement('div');
      row.className = 'exercise-report-item';
      
      const isPlank = ex.id.includes('plank') || ex.name.toLowerCase().includes('планк');
      let valText = '';
      if (isPlank) {
        valText = `${totalPlankSecs} сек в планке`;
      } else if (ex.type === 'sets') {
        valText = `Цель: ${ex.target} подх.`;
      } else {
        valText = `${totalReps} повторений`;
      }

      row.innerHTML = `
        <div class="ex-rep-title">
          <span>${ex.icon || '🏋️'}</span>
          <span>${escapeHtml(ex.name)}</span>
        </div>
        <div class="ex-rep-val">
          ${valText}
        </div>
      `;
      exListEl.appendChild(row);
    });
  }
}

function getScheduleSportExercises() {
  if (!currentUser || !currentUser.scheduleSlots) return [];
  const sportSlots = currentUser.scheduleSlots.filter(s => s.category === 'sport');
  const result = [];
  sportSlots.forEach(slot => {
    const exs = slot.exercises || [];
    exs.forEach(ex => {
      const sets = parseInt(ex.sets, 10) || 1;
      const target = parseInt(ex.target, 10) || 10;
      const unit = ex.unit || 'раз';
      const isRepsOrSec = unit === 'раз' || unit === 'сек' || unit === 'мин';
      const totalPlan = isRepsOrSec ? (sets * target) : sets;

      result.push({
        slotId: slot.id,
        slotName: slot.name,
        slotTime: `${slot.start} - ${slot.end}`,
        name: ex.name,
        sets,
        target,
        unit,
        totalPlan
      });
    });
  });
  return result;
}

function renderScheduleWorkoutComparison() {
  const container = document.getElementById('scheduleWorkoutComparisonList');
  if (!container || !currentUser) return;
  container.innerHTML = '';

  const sportExercises = getScheduleSportExercises();
  const todayKey = getTodayDateKey();
  if (!currentUser.workoutLogs[todayKey]) currentUser.workoutLogs[todayKey] = { exercises: {}, scheduleDone: {}, scheduleSets: {} };
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};

  if (sportExercises.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px 14px; text-align: center; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--border);">
        <div style="font-size: 26px; margin-bottom: 6px;">📋</div>
        <div style="font-size: 14px; font-weight: 700;">В расписании пока нет упражнений</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
          Откройте вкладку «Расписание», нажмите на блок тренировки (категория «Спорт») и добавьте упражнения с количеством подходов и повторений.
        </div>
      </div>
    `;
    return;
  }

  sportExercises.forEach((item, exIdx) => {
    const key = item.name;
    const cardId = 'sc_' + exIdx + '_' + (item.slotId || 'slot');

    let setsArr = todayLog.scheduleSets[key];
    if (!Array.isArray(setsArr)) {
      const count = Math.max(1, item.sets || 1);
      setsArr = [];
      const prevDone = todayLog.scheduleDone[key];
      if (prevDone !== undefined && prevDone > 0) {
        if (prevDone === item.totalPlan && item.sets > 0) {
          for (let i = 0; i < count; i++) setsArr.push(item.target);
        } else {
          let rem = prevDone;
          for (let i = 0; i < count; i++) {
            const val = Math.min(item.target, rem);
            setsArr.push(val);
            rem -= val;
          }
          if (rem > 0 && setsArr.length > 0) setsArr[setsArr.length - 1] += rem;
        }
      } else {
        for (let i = 0; i < count; i++) setsArr.push(0);
      }
      todayLog.scheduleSets[key] = setsArr;
    }

    // Ensure setsArr has at least item.sets entries
    while (setsArr.length < item.sets) {
      setsArr.push(0);
    }

    // Sum of all sets
    const totalFact = setsArr.reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
    todayLog.scheduleDone[key] = totalFact;

    const totalPlan = item.totalPlan;
    const diff = totalFact - totalPlan;
    const isCompleted = totalFact >= totalPlan;
    const pct = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;

    let diffBadgeHtml = '';
    if (diff < 0) {
      const remaining = Math.abs(diff);
      diffBadgeHtml = `<span class="diff-badge diff-remaining">Осталось: ${remaining} ${item.unit} (${pct}%) ⏳</span>`;
    } else if (diff === 0) {
      diffBadgeHtml = `<span class="diff-badge diff-exact">✓ Выполнено в точности (100%) 🎯</span>`;
    } else {
      diffBadgeHtml = `<span class="diff-badge diff-over">Перевыполнено: +${diff} ${item.unit} (${pct}%) 🔥</span>`;
    }

    const stepDelta = (item.unit === 'сек' ? 5 : 1);
    const setsRowsHtml = setsArr.map((val, sIdx) => {
      const setNumber = sIdx + 1;
      const isTargetHit = (val === item.target && val > 0);
      const isOverHit = (val > item.target);
      const canDelete = setsArr.length > item.sets;

      return `
        <div class="sched-set-row ${isTargetHit ? 'set-hit' : (isOverHit ? 'set-over' : '')}">
          <div class="sched-set-label-wrap">
            <span class="sched-set-badge">${setNumber}-й подход</span>
            ${isTargetHit ? '<span class="sched-set-status-hit" title="Норма выполнена!">✓</span>' : (isOverHit ? '<span class="sched-set-status-over" title="Перевыполнено!">🔥</span>' : '')}
          </div>

          <div class="sched-set-controls">
            <button type="button" class="sched-set-step-btn" title="Уменьшить" onclick="stepScheduleSetVal('${escapeHtml(item.name)}', ${sIdx}, -${stepDelta})">−</button>
            <input type="number" 
                   class="sched-set-input" 
                   value="${val}" 
                   min="0" 
                   onfocus="this.select()"
                   oninput="handleScheduleSetInput(this, '${escapeHtml(item.name)}', ${sIdx}, ${totalPlan}, '${item.unit}', '${cardId}')"
                   onchange="setScheduleSetVal('${escapeHtml(item.name)}', ${sIdx}, this.value)">
            <button type="button" class="sched-set-step-btn" title="Увеличить" onclick="stepScheduleSetVal('${escapeHtml(item.name)}', ${sIdx}, ${stepDelta})">+</button>
            <button type="button" class="sched-set-target-btn" title="Поставить план ${item.target} ${item.unit}" onclick="setScheduleSetVal('${escapeHtml(item.name)}', ${sIdx}, ${item.target})">=${item.target}</button>
            <span class="sched-set-unit">${item.unit}</span>
            ${canDelete ? `
              <button type="button" class="sched-set-del-btn" title="Удалить подход" onclick="removeScheduleSet('${escapeHtml(item.name)}', ${sIdx})">✕</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const card = document.createElement('div');
    card.className = `schedule-comparison-item ${isCompleted ? 'completed' : ''}`;
    card.id = `sched-card-${cardId}`;
    card.innerHTML = `
      <div class="sched-comp-top">
        <div>
          <div class="sched-comp-title">
            <span>💪</span>
            <span>${escapeHtml(item.name)}</span>
          </div>
          <div class="sched-comp-slot-tag">Блок расписания: ${escapeHtml(item.slotName)} (${item.slotTime})</div>
        </div>
        <div id="sched-badge-${cardId}">
          ${diffBadgeHtml}
        </div>
      </div>

      <div class="sched-comp-grid">
        <div class="sched-comp-col">
          <span class="sched-comp-col-label">План из расписания</span>
          <span class="sched-comp-plan-val">${item.sets} подх. × ${item.target} ${item.unit} <b>(= ${totalPlan} ${item.unit})</b></span>
        </div>

        <div class="sched-comp-col">
          <span class="sched-comp-col-label">Факт (сумма подходов)</span>
          <div class="sched-comp-fact-total" id="sched-fact-${cardId}">
            <b>${totalFact}</b> ${item.unit}
          </div>
        </div>

        <div class="sched-comp-col">
          <span class="sched-comp-col-label">Разница (Факт − План)</span>
          <div id="sched-diff-${cardId}" style="font-size: 14px; font-weight: 800; color: ${diff >= 0 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">
            ${diff > 0 ? `+${diff}` : diff} ${item.unit}
          </div>
        </div>
      </div>

      <div class="today-rep-bar-bg" style="margin-top: 8px;">
        <div id="sched-bar-${cardId}" class="today-rep-bar-fill" style="width: ${Math.min(100, pct)}%; background-color: ${isCompleted ? 'var(--accent-green)' : (totalFact > 0 ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.2)')}"></div>
      </div>

      <div class="sched-sets-breakdown-box">
        <div class="sched-sets-header">
          <div class="sched-sets-header-title">
            <span>🔢 По подходам (план: ${item.sets} по ${item.target} ${item.unit}):</span>
          </div>
          <div class="sched-sets-header-actions">
            <button type="button" class="sched-quick-action-btn" title="Заполнить все подходы плановым количеством" onclick="fillScheduleSetsWithTarget('${escapeHtml(item.name)}', ${item.target})">
              ⚡ Все по ${item.target}
            </button>
            <button type="button" class="sched-quick-action-btn add-btn" title="Добавить еще один подход" onclick="addScheduleExtraSet('${escapeHtml(item.name)}')">
              + Подход
            </button>
          </div>
        </div>

        <div class="sched-sets-grid">
          ${setsRowsHtml}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function handleScheduleSetInput(inputEl, exName, setIndex, totalPlan, unit, cardId) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.workoutLogs[todayKey]) {
    currentUser.workoutLogs[todayKey] = { exercises: {}, scheduleDone: {}, scheduleSets: {} };
  }
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  while (todayLog.scheduleSets[exName].length <= setIndex) todayLog.scheduleSets[exName].push(0);

  const num = Math.max(0, parseInt(inputEl.value, 10) || 0);
  todayLog.scheduleSets[exName][setIndex] = num;

  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;

  // Live update card DOM without stealing focus
  const factEl = document.getElementById(`sched-fact-${cardId}`);
  if (factEl) factEl.innerHTML = `<b>${totalFact}</b> ${unit}`;

  const diff = totalFact - totalPlan;
  const diffEl = document.getElementById(`sched-diff-${cardId}`);
  if (diffEl) {
    diffEl.textContent = `${diff > 0 ? '+' + diff : diff} ${unit}`;
    diffEl.style.color = diff >= 0 ? 'var(--accent-green)' : 'var(--accent-yellow)';
  }

  const pct = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;
  const isCompleted = totalFact >= totalPlan;

  const badgeEl = document.getElementById(`sched-badge-${cardId}`);
  if (badgeEl) {
    if (diff < 0) {
      badgeEl.innerHTML = `<span class="diff-badge diff-remaining">Осталось: ${Math.abs(diff)} ${unit} (${pct}%) ⏳</span>`;
    } else if (diff === 0) {
      badgeEl.innerHTML = `<span class="diff-badge diff-exact">✓ Выполнено в точности (100%) 🎯</span>`;
    } else {
      badgeEl.innerHTML = `<span class="diff-badge diff-over">Перевыполнено: +${diff} ${unit} (${pct}%) 🔥</span>`;
    }
  }

  const barEl = document.getElementById(`sched-bar-${cardId}`);
  if (barEl) {
    barEl.style.width = `${Math.min(100, pct)}%`;
    barEl.style.backgroundColor = isCompleted ? 'var(--accent-green)' : (totalFact > 0 ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.2)');
  }

  const cardEl = document.getElementById(`sched-card-${cardId}`);
  if (cardEl) {
    if (isCompleted) cardEl.classList.add('completed');
    else cardEl.classList.remove('completed');
  }

  syncScheduleExerciseWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
}

function setScheduleSetVal(exName, setIndex, val) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.workoutLogs[todayKey]) {
    currentUser.workoutLogs[todayKey] = { exercises: {}, scheduleDone: {}, scheduleSets: {} };
  }
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  while (todayLog.scheduleSets[exName].length <= setIndex) todayLog.scheduleSets[exName].push(0);

  const num = Math.max(0, parseInt(val, 10) || 0);
  todayLog.scheduleSets[exName][setIndex] = num;

  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;

  syncScheduleExerciseWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderScheduleWorkoutComparison();
  renderTodayWorkoutReport();
  renderPushups();
}

function stepScheduleSetVal(exName, setIndex, delta) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.workoutLogs[todayKey]) {
    currentUser.workoutLogs[todayKey] = { exercises: {}, scheduleDone: {}, scheduleSets: {} };
  }
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  while (todayLog.scheduleSets[exName].length <= setIndex) todayLog.scheduleSets[exName].push(0);

  const cur = parseInt(todayLog.scheduleSets[exName][setIndex], 10) || 0;
  const next = Math.max(0, cur + delta);
  setScheduleSetVal(exName, setIndex, next);
}

function fillScheduleSetsWithTarget(exName, targetVal) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  for (let i = 0; i < todayLog.scheduleSets[exName].length; i++) {
    todayLog.scheduleSets[exName][i] = targetVal;
  }
  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;
  syncScheduleExerciseWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderScheduleWorkoutComparison();
  renderTodayWorkoutReport();
  renderPushups();
}

function addScheduleExtraSet(exName) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  todayLog.scheduleSets[exName].push(0);
  saveCurrentUser();
  renderScheduleWorkoutComparison();
  renderTodayWorkoutReport();
}

function removeScheduleSet(exName, setIndex) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleSets || !Array.isArray(todayLog.scheduleSets[exName])) return;
  todayLog.scheduleSets[exName].splice(setIndex, 1);
  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;
  syncScheduleExerciseWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderScheduleWorkoutComparison();
  renderTodayWorkoutReport();
  renderPushups();
}

function syncScheduleExerciseWithCatalog(exName, totalFact, setsArray) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.workoutLogs[todayKey]) return;
  const todayLog = currentUser.workoutLogs[todayKey];

  const matchedEx = (currentUser.exercises || []).find(e => e.name.toLowerCase() === exName.toLowerCase());
  if (matchedEx) {
    if (!todayLog.exercises[matchedEx.id]) {
      todayLog.exercises[matchedEx.id] = (matchedEx.type === 'sets' ? { sets: [], completed: false } : { done: 0, completed: false });
    }
    const exData = todayLog.exercises[matchedEx.id];
    if (matchedEx.type === 'sets') {
      const existingSets = exData.sets || [];
      exData.sets = (setsArray || []).map((reps, i) => ({
        weight: (existingSets[i] && existingSets[i].weight !== undefined) ? existingSets[i].weight : 0,
        reps: reps
      }));
      exData.completed = (totalFact >= (matchedEx.target || 1));
    } else {
      exData.done = totalFact;
      exData.completed = (totalFact >= (matchedEx.target || 1));
    }
  }
}

function setScheduleExerciseDone(exName, val) {
  if (!currentUser) return;
  const num = Math.max(0, parseInt(val, 10) || 0);
  const todayKey = getTodayDateKey();
  if (!currentUser.workoutLogs[todayKey]) currentUser.workoutLogs[todayKey] = { exercises: {}, scheduleDone: {}, scheduleSets: {} };
  const todayLog = currentUser.workoutLogs[todayKey];
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  todayLog.scheduleDone[exName] = num;

  if (Array.isArray(todayLog.scheduleSets[exName]) && todayLog.scheduleSets[exName].length > 0) {
    const len = todayLog.scheduleSets[exName].length;
    const base = Math.floor(num / len);
    let rem = num % len;
    for (let i = 0; i < len; i++) {
      todayLog.scheduleSets[exName][i] = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
    }
  }

  syncScheduleExerciseWithCatalog(exName, num, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderPushups();
  renderReport();
  renderScheduleWorkoutComparison();
}

function stepScheduleExerciseDone(exName, delta) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const todayLog = currentUser.workoutLogs[todayKey] || { exercises: {}, scheduleDone: {} };
  const current = (todayLog.scheduleDone && todayLog.scheduleDone[exName]) || 0;
  setScheduleExerciseDone(exName, current + delta);
}

function renderTodayWorkoutReport() {
  const container = document.getElementById('todayWorkoutReportList');
  if (!container || !currentUser) return;
  container.innerHTML = '';

  const todayKey = getTodayDateKey();
  const todayLog = (currentUser.workoutLogs && currentUser.workoutLogs[todayKey]) || { exercises: {}, scheduleDone: {}, scheduleSets: {} };
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};

  const sportExercises = getScheduleSportExercises();

  const todaySub = document.getElementById('repTodaySubtitle');
  if (todaySub) {
    todaySub.textContent = `План из расписания на ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  }

  if (sportExercises.length === 0) {
    container.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 13px;">
        В блоках расписания категории «Спорт» на сегодня нет упражнений.
      </div>
    `;
    return;
  }

  sportExercises.forEach(item => {
    let factDone = todayLog.scheduleDone[item.name];
    if (factDone === undefined) {
      const matchedEx = (currentUser.exercises || []).find(e => e.name.toLowerCase() === item.name.toLowerCase());
      if (matchedEx && todayLog.exercises && todayLog.exercises[matchedEx.id]) {
        const exData = todayLog.exercises[matchedEx.id];
        factDone = matchedEx.type === 'sets' ? ((exData.sets && exData.sets.length) || 0) : (exData.done || 0);
      } else {
        factDone = 0;
      }
    }

    const totalPlan = item.totalPlan;
    const diff = factDone - totalPlan;
    const isCompleted = factDone >= totalPlan;
    const pct = totalPlan > 0 ? Math.round((factDone / totalPlan) * 100) : 0;

    let badgeHtml = '';
    if (diff < 0) {
      badgeHtml = `<span class="rep-badge in-progress">Осталось: ${Math.abs(diff)} ${item.unit} (${pct}%)</span>`;
    } else if (diff === 0) {
      badgeHtml = `<span class="rep-badge done">✓ Выполнено в точности (100%)</span>`;
    } else {
      badgeHtml = `<span class="rep-badge done">🔥 Перевыполнено (+${diff} ${item.unit})</span>`;
    }

    let setsBreakdownHtml = '';
    if (todayLog.scheduleSets && Array.isArray(todayLog.scheduleSets[item.name]) && todayLog.scheduleSets[item.name].length > 0) {
      const chips = todayLog.scheduleSets[item.name].map((sVal, idx) => {
        return `<span class="report-set-chip">${idx + 1}-й: <b>${sVal}</b></span>`;
      }).join(' ');
      setsBreakdownHtml = `
        <div class="report-sets-breakdown">
          <span style="font-size: 11px; color: var(--text-dim); margin-right: 4px; align-self: center;">По подходам:</span>
          ${chips}
        </div>
      `;
    }

    const row = document.createElement('div');
    row.className = `today-workout-report-item ${isCompleted ? 'done' : ''}`;
    row.innerHTML = `
      <div class="today-rep-top">
        <div class="today-rep-name">
          <span>💪</span>
          <span>${escapeHtml(item.name)}</span>
          <span style="font-size: 11px; font-weight: 500; color: var(--text-dim);">(${escapeHtml(item.slotName)})</span>
        </div>
        ${badgeHtml}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; flex-wrap: wrap; gap: 4px;">
        <span style="color: #a5b4fc;">План: <b>${item.sets} подх. × ${item.target} ${item.unit} (${totalPlan} ${item.unit})</b></span>
        <span>Факт: <b>${factDone} ${item.unit}</b> (Разница: <b style="color: ${diff >= 0 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">${diff > 0 ? `+${diff}` : diff}</b>)</span>
      </div>
      ${setsBreakdownHtml}
      <div class="today-rep-bar-bg" style="margin-top: 6px;">
        <div class="today-rep-bar-fill" style="width: ${Math.min(100, pct)}%; background-color: ${isCompleted ? 'var(--accent-green)' : (factDone > 0 ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.2)')}"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

/* =========================================================
   STUDY & READING MODULE (ACCA, Свободное чтение)
   ========================================================= */

let currentStudyFilterDay = 'today';

function setStudyDayFilter(day) {
  currentStudyFilterDay = day;
  document.querySelectorAll('#viewStudy .day-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`studyFilterDay_${day}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderStudy();
}

function initUserStudyActivities() {
  if (!currentUser) return;
  if (!currentUser.studyActivities || currentUser.studyActivities.length === 0) {
    currentUser.studyActivities = JSON.parse(JSON.stringify(DEFAULT_STUDY_ACTIVITIES));
  }
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = {
      status: 'pending',
      activities: {},
      scheduleDone: {},
      scheduleSets: {}
    };
  }
  const todayStudyLog = currentUser.studyLogs[todayKey];
  if (!todayStudyLog.activities) todayStudyLog.activities = {};

  currentUser.studyActivities.forEach(act => {
    if (!todayStudyLog.activities[act.id]) {
      todayStudyLog.activities[act.id] = act.type === 'reps'
        ? { done: 0, completed: false }
        : { sets: [], completed: false };
    }
  });
}

function renderStudy() {
  if (!currentUser) return;
  initUserStudyActivities();
  const todayKey = getTodayDateKey();
  const todayStudyLog = currentUser.studyLogs[todayKey];

  const currentDayIndex = new Date().getDay();
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayCode = dayMap[currentDayIndex];

  let visibleActivities = currentUser.studyActivities || [];
  if (currentStudyFilterDay === 'today') {
    visibleActivities = visibleActivities.filter(a => (a.days || []).includes(todayDayCode));
  } else if (currentStudyFilterDay !== 'all') {
    visibleActivities = visibleActivities.filter(a => (a.days || []).includes(currentStudyFilterDay));
  }

  const container = document.getElementById('studyActivitiesContainer');
  if (container) {
    container.innerHTML = '';
    if (visibleActivities.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px 14px; text-align: center; color: var(--text-dim); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--border);">
          <div style="font-size: 28px; margin-bottom: 6px;">📚</div>
          <div style="font-size: 14px; font-weight: 700;">На этот день нет предметов в программе</div>
          <div style="font-size: 12px; margin-top: 4px;">Нажмите «+ Предмет / Чтение», чтобы добавить!</div>
        </div>
      `;
    } else {
      visibleActivities.forEach(act => {
        const actData = todayStudyLog.activities[act.id] || (act.type === 'reps' ? { done: 0, completed: false } : { sets: [], completed: false });
        const card = document.createElement('div');
        const isCompleted = actData.completed || false;
        card.className = `exercise-card ${isCompleted ? 'completed' : ''}`;

        const dayLabels = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' };
        const dayChipsHtml = (act.days || []).map(d => `
          <span class="ex-day-chip ${d === todayDayCode ? 'today-day' : ''}">${dayLabels[d] || d}</span>
        `).join('');

        let bodyHtml = '';
        if (act.type === 'reps') {
          const done = actData.done || 0;
          const target = act.target || 20;
          const unit = act.unit || 'задач';
          const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
          const remaining = Math.max(0, target - done);

          const q1 = unit === 'стр' ? 10 : 5;
          const q2 = unit === 'стр' ? 20 : 10;
          const q3 = unit === 'стр' ? 30 : 20;

          bodyHtml = `
            <div class="progress-bar-bg" style="margin: 10px 0 6px 0;">
              <div class="progress-bar-fill" style="width: ${percent}%; background: linear-gradient(90deg, #4f46e5, #06b6d4);"></div>
            </div>
            <div class="progress-status-row" style="margin-bottom: 8px;">
              <span>${isCompleted ? '✓ Выполнено!' : `Осталось: ${remaining} ${unit}`}</span>
              <span>${percent}%</span>
            </div>
            <div class="quick-add-grid">
              <button class="rep-btn" onclick="addVolumeToStudyActivity('${act.id}', ${q1})">+${q1}</button>
              <button class="rep-btn" onclick="addVolumeToStudyActivity('${act.id}', ${q2})">+${q2}</button>
              <button class="rep-btn" onclick="addVolumeToStudyActivity('${act.id}', ${q3})">+${q3}</button>
              <button class="rep-btn" onclick="completeStudyActivity('${act.id}')">Завершить 🎯</button>
            </div>
          `;
        } else {
          const sets = actData.sets || [];
          const setsHtml = sets.length > 0
            ? sets.map((s, idx) => `
                <div class="set-chip">
                  <span class="set-num">#${idx + 1}</span>
                  <span>${s.duration || 45} мин • ${s.volume || 10} ${act.unit || 'задач'}</span>
                  <span class="set-chip-delete" onclick="deleteStudySet('${act.id}', ${idx})">✕</span>
                </div>
              `).join('')
            : '<div style="font-size: 12px; color: var(--text-dim);">Сессии пока не записаны</div>';

          bodyHtml = `
            <div class="sets-chips-list">
              ${setsHtml}
            </div>
            <div class="ex-card-actions">
              <button class="add-set-trigger-btn" onclick="openAddStudySetModal('${act.id}', '${escapeHtml(act.name)}')">
                + Записать сессию (${sets.length}/${act.target})
              </button>
              <button class="quick-done-check-btn ${isCompleted ? 'done' : ''}" onclick="toggleStudyActivityCompleted('${act.id}')">
                ${isCompleted ? '✓ Сделано' : 'Завершить'}
              </button>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="ex-header">
            <div class="ex-title-wrap">
              <div class="ex-icon">${act.icon || '📚'}</div>
              <div>
                <div class="ex-name">${escapeHtml(act.name)}</div>
                <div class="ex-meta">Цель: ${act.target} ${act.unit || 'задач'}</div>
                <div class="ex-days-row">
                  <span class="ex-days-label">Дни:</span>
                  ${dayChipsHtml}
                </div>
              </div>
            </div>
            <div class="ex-actions-top">
              <button class="ex-btn-icon" title="Изменить цель" onclick="openChangeTargetModalStudy('${act.id}', ${act.target}, '${escapeHtml(act.unit || '')}')">✏️</button>
              <button class="ex-btn-icon" title="Удалить" onclick="deleteStudyActivity('${act.id}')">🗑️</button>
            </div>
          </div>
          ${bodyHtml}
        `;
        container.appendChild(card);
      });
    }
  }

  // Calculate totals and verdict
  let completedCount = 0;
  let totalVolumeToday = 0;
  visibleActivities.forEach(a => {
    const actData = todayStudyLog.activities[a.id];
    if (actData && actData.completed) completedCount++;
    if (actData) {
      if (a.type === 'reps') totalVolumeToday += (actData.done || 0);
      else if (actData.sets) totalVolumeToday += actData.sets.reduce((s, x) => s + (parseInt(x.volume, 10) || 0), 0);
    }
  });

  const actDoneEl = document.getElementById('studyActivitiesDone');
  if (actDoneEl) actDoneEl.textContent = `${completedCount}/${visibleActivities.length}`;

  const streakEl = document.getElementById('studyStreakCount');
  if (streakEl) streakEl.textContent = currentUser.studyStreak || 0;

  const totalVolEl = document.getElementById('studyTotalDoneToday');
  if (totalVolEl) totalVolEl.textContent = totalVolumeToday;

  const verdictBox = document.getElementById('studyVerdictBox');
  const isAllDone = visibleActivities.length > 0 && completedCount === visibleActivities.length;
  if (verdictBox) {
    if (isAllDone || todayStudyLog.status === 'success') {
      todayStudyLog.status = 'success';
      verdictBox.className = 'day-verdict-box verdict-success';
      verdictBox.innerHTML = `
        <div>🎯 ПРОГРАММА УЧЁБЫ НА СЕГОДНЯ ВЫПОЛНЕНА!</div>
        <div style="font-size: 12px; font-weight: 500; opacity: 0.9;">
          Отличная инвестиция в мозг и карьеру! Так держать!
        </div>
      `;
    } else {
      todayStudyLog.status = 'pending';
      verdictBox.className = 'day-verdict-box';
      verdictBox.innerHTML = `
        <div>📖 УЧЁБА В ПРОЦЕССЕ (${completedCount}/${visibleActivities.length})</div>
        <div style="font-size: 12px; font-weight: 500; opacity: 0.9;">
          Закрой плановые задачи по ACCA и чтению сегодня!
        </div>
      `;
    }
  }

  saveCurrentUser();
  renderBooks();
  renderStudyHistory();
  renderScheduleStudyComparison();
}

/* =========================================================
   BOOK TRACKER FUNCTIONS
   ========================================================= */

function renderBooks() {
  const container = document.getElementById('booksListContainer');
  if (!container || !currentUser) return;
  container.innerHTML = '';

  const books = currentUser.books || [];
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = { status: 'pending', activities: {}, scheduleDone: {}, scheduleSets: {}, bookPages: {} };
  }
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.bookPages) todayLog.bookPages = {};

  if (books.length === 0) {
    container.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 13px;">
        Книг в трекере пока нет. Нажмите «+ Добавить книгу», чтобы начать учет страниц!
      </div>
    `;
    return;
  }

  books.forEach(book => {
    const totalPages = Math.max(1, parseInt(book.totalPages, 10) || 100);
    const dailyTarget = Math.max(1, parseInt(book.dailyTarget, 10) || 20);

    // Base page before today's reading
    const basePage = (book.basePage !== undefined) ? parseInt(book.basePage, 10) : (parseInt(book.currentPage, 10) || 0);

    // Pages read today according to schedule
    let todayReadForBook = (todayLog.bookPages && todayLog.bookPages[book.id]) || 0;
    if (todayReadForBook === 0 && todayLog.scheduleDone) {
      const bTitleLower = (book.title || '').toLowerCase();
      for (const [exName, factVal] of Object.entries(todayLog.scheduleDone)) {
        const exLower = exName.toLowerCase();
        if (exLower === bTitleLower || 
            (bTitleLower.length > 5 && exLower.includes(bTitleLower)) || 
            (exLower.length > 5 && bTitleLower.includes(exLower)) ||
            ((exLower.includes('чтени') || exLower.includes('книг')) && books.length === 1)) {
          todayReadForBook = parseInt(factVal, 10) || 0;
          break;
        }
      }
    }

    const effectiveCurrentPage = Math.min(totalPages, Math.max(0, basePage + todayReadForBook));
    const percent = Math.min(100, Math.round((effectiveCurrentPage / totalPages) * 100));
    const remainingPages = Math.max(0, totalPages - effectiveCurrentPage);
    const daysLeft = dailyTarget > 0 ? Math.ceil(remainingPages / dailyTarget) : 0;
    const isCompleted = effectiveCurrentPage >= totalPages;

    const card = document.createElement('div');
    card.className = `book-card ${isCompleted ? 'completed' : ''}`;
    card.id = `book-card-${book.id}`;
    card.innerHTML = `
      <div class="book-card-top">
        <div class="book-info">
          <div class="book-title-row">
            <span class="book-icon">📖</span>
            <span class="book-title-text">${escapeHtml(book.title)}</span>
            ${isCompleted ? '<span class="diff-badge diff-exact" style="margin-left: 6px;">✓ Прочитана! 🏆</span>' : ''}
          </div>
          ${book.author ? `<div class="book-author">${escapeHtml(book.author)}</div>` : ''}
        </div>
        <div class="ex-actions-top">
          <button class="ex-btn-icon" title="Редактировать книгу / страницу" onclick="openEditBookModal('${book.id}')">✏️</button>
          <button class="ex-btn-icon" title="Удалить книгу" onclick="deleteBook('${book.id}')">🗑️</button>
        </div>
      </div>

      <div class="book-progress-box" style="margin-bottom: 0;">
        <div class="book-progress-header">
          <span class="book-pages-counter">
            Страница <b>${effectiveCurrentPage}</b> из <b>${totalPages}</b>
            ${todayReadForBook > 0 ? `<span style="color: var(--accent-green); font-size: 11px; margin-left: 6px; font-weight: 700;">(+${todayReadForBook} сегодня по расписанию)</span>` : ''}
          </span>
          <span class="book-pct-badge">${percent}%</span>
        </div>
        <div class="today-rep-bar-bg" style="margin: 6px 0 8px 0;">
          <div class="today-rep-bar-fill" style="width: ${percent}%; background: ${isCompleted ? 'var(--accent-green)' : 'linear-gradient(90deg, #10b981, #06b6d4)'};"></div>
        </div>
        <div class="book-sub-stats">
          <span>Цель: <b>${dailyTarget} стр./день</b></span>
          <span>${isCompleted ? '🎉 Все страницы прочитаны!' : `Осталось: <b>${remainingPages} стр.</b> (~${daysLeft} дн.)`}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function openAddBookModal() {
  document.getElementById('editBookId').value = '';
  document.getElementById('bookModalTitle').textContent = 'Добавить книгу в трекер';
  document.getElementById('bookForm').reset();
  document.getElementById('bookDailyTargetInput').value = 25;
  document.getElementById('bookCurrentPageInput').value = 0;
  document.getElementById('bookModal').classList.remove('hidden');
}

function openEditBookModal(bookId) {
  const book = (currentUser.books || []).find(b => b.id === bookId);
  if (!book) return;
  document.getElementById('editBookId').value = book.id;
  document.getElementById('bookModalTitle').textContent = 'Редактировать книгу';
  document.getElementById('bookTitleInput').value = book.title;
  document.getElementById('bookAuthorInput').value = book.author || '';
  document.getElementById('bookTotalPagesInput').value = book.totalPages;
  document.getElementById('bookDailyTargetInput').value = book.dailyTarget;
  document.getElementById('bookCurrentPageInput').value = (book.basePage !== undefined) ? book.basePage : (book.currentPage || 0);
  document.getElementById('bookModal').classList.remove('hidden');
}

function closeBookModal() {
  document.getElementById('bookModal').classList.add('hidden');
}

function saveBookForm(e) {
  e.preventDefault();
  const id = document.getElementById('editBookId').value;
  const title = document.getElementById('bookTitleInput').value.trim();
  const author = document.getElementById('bookAuthorInput').value.trim();
  const totalPages = parseInt(document.getElementById('bookTotalPagesInput').value, 10) || 100;
  const dailyTarget = parseInt(document.getElementById('bookDailyTargetInput').value, 10) || 25;
  const inputPage = Math.min(totalPages, Math.max(0, parseInt(document.getElementById('bookCurrentPageInput').value, 10) || 0));

  if (!title) return;

  if (!currentUser.books) currentUser.books = [];

  if (id) {
    const existing = currentUser.books.find(b => b.id === id);
    if (existing) {
      existing.title = title;
      existing.author = author;
      existing.totalPages = totalPages;
      existing.dailyTarget = dailyTarget;
      existing.basePage = inputPage;
      existing.currentPage = inputPage;
      existing.status = (inputPage >= totalPages) ? 'completed' : 'reading';
    }
  } else {
    const newBook = {
      id: 'book_' + Date.now(),
      title,
      author,
      totalPages,
      dailyTarget,
      basePage: inputPage,
      currentPage: inputPage,
      status: (inputPage >= totalPages) ? 'completed' : 'reading',
      startedDate: getTodayDateKey()
    };
    currentUser.books.push(newBook);
  }

  saveCurrentUser();
  closeBookModal();
  renderBooks();
  renderStudy();
}

function deleteBook(bookId) {
  if (!currentUser || !currentUser.books) return;
  if (confirm('Удалить эту книгу из трекера?')) {
    currentUser.books = currentUser.books.filter(b => b.id !== bookId);
    saveCurrentUser();
    renderBooks();
    renderStudy();
  }
}

function setBookTodayPages(bookId, val) {
  if (!currentUser) return;
  const num = Math.max(0, parseInt(val, 10) || 0);
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = { status: 'pending', activities: {}, scheduleDone: {}, scheduleSets: {}, bookPages: {} };
  }
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.bookPages) todayLog.bookPages = {};

  const prevRead = todayLog.bookPages[bookId] || 0;
  const diff = num - prevRead;
  todayLog.bookPages[bookId] = num;

  const book = (currentUser.books || []).find(b => b.id === bookId);
  if (book) {
    book.currentPage = Math.min(book.totalPages, Math.max(0, (book.currentPage || 0) + diff));
    if (book.currentPage >= book.totalPages) {
      book.status = 'completed';
    } else {
      book.status = 'reading';
    }
  }

  // Sync with Reading activity in studyActivities
  const readingAct = (currentUser.studyActivities || []).find(a => a.name.toLowerCase().includes('чтени') || a.unit === 'стр');
  if (readingAct && todayLog.activities && todayLog.activities[readingAct.id]) {
    todayLog.activities[readingAct.id].done = Math.max(0, (todayLog.activities[readingAct.id].done || 0) + diff);
    if (todayLog.activities[readingAct.id].done >= readingAct.target) {
      todayLog.activities[readingAct.id].completed = true;
    }
  }

  saveCurrentUser();
  renderBooks();
  renderStudy();
  renderReport();
}

function stepBookTodayPages(bookId, delta) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  const todayLog = (currentUser.studyLogs && currentUser.studyLogs[todayKey]) || {};
  const cur = (todayLog.bookPages && todayLog.bookPages[bookId]) || 0;
  setBookTodayPages(bookId, cur + delta);
}

function addVolumeToStudyActivity(actId, count) {
  if (!currentUser) return;
  initUserStudyActivities();
  const todayKey = getTodayDateKey();
  const actData = currentUser.studyLogs[todayKey].activities[actId];
  if (!actData) return;
  actData.done = (actData.done || 0) + count;
  const act = (currentUser.studyActivities || []).find(a => a.id === actId);
  if (act && actData.done >= act.target) {
    actData.completed = true;
  }
  playHapticSound('rep');
  saveCurrentUser();
  renderStudy();
  renderReport();
}

function completeStudyActivity(actId) {
  if (!currentUser) return;
  initUserStudyActivities();
  const todayKey = getTodayDateKey();
  const act = (currentUser.studyActivities || []).find(a => a.id === actId);
  const actData = currentUser.studyLogs[todayKey].activities[actId];
  if (!actData || !act) return;
  actData.done = Math.max(actData.done || 0, act.target);
  actData.completed = true;
  playHapticSound('success');
  saveCurrentUser();
  renderStudy();
  renderReport();
}

function completeFullStudyToday() {
  if (!currentUser) return;
  initUserStudyActivities();
  const todayKey = getTodayDateKey();
  const todayStudyLog = currentUser.studyLogs[todayKey];
  (currentUser.studyActivities || []).forEach(act => {
    const actData = todayStudyLog.activities[act.id];
    if (actData) {
      if (act.type === 'reps') actData.done = Math.max(actData.done || 0, act.target);
      actData.completed = true;
    }
  });
  todayStudyLog.status = 'success';
  currentUser.studyStreak = (currentUser.studyStreak || 0) + 1;
  playHapticSound('success');
  saveCurrentUser();
  renderStudy();
  renderReport();
  alert('🎓 Поздравляем! Вся программа учёбы и чтения на сегодня выполнена на 100%!');
}

function toggleStudyActivityCompleted(actId) {
  if (!currentUser) return;
  initUserStudyActivities();
  const todayKey = getTodayDateKey();
  const actData = currentUser.studyLogs[todayKey].activities[actId];
  if (!actData) return;
  actData.completed = !actData.completed;
  saveCurrentUser();
  renderStudy();
  renderReport();
}

function openAddStudyModal() {
  document.getElementById('studyForm').reset();
  document.getElementById('studyModal').classList.remove('hidden');
}

function closeStudyModal() {
  document.getElementById('studyModal').classList.add('hidden');
}

function saveCustomStudyActivity(e) {
  e.preventDefault();
  const name = document.getElementById('newStudyName').value.trim();
  const icon = document.getElementById('newStudyIcon').value;
  const unit = document.getElementById('newStudyUnit').value;
  const type = document.getElementById('newStudyType').value;
  const target = parseInt(document.getElementById('newStudyTarget').value, 10) || 20;

  const selectedDays = [];
  document.querySelectorAll('#newStudyDaysGrid input:checked').forEach(cb => {
    selectedDays.push(cb.value);
  });

  if (!name) return;

  const newAct = {
    id: 'study_' + Date.now(),
    name,
    icon,
    unit,
    type,
    target,
    days: selectedDays.length > 0 ? selectedDays : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  };

  if (!currentUser.studyActivities) currentUser.studyActivities = [];
  currentUser.studyActivities.push(newAct);
  saveCurrentUser();
  closeStudyModal();
  renderStudy();
  renderReport();
}

function deleteStudyActivity(actId) {
  if (!currentUser) return;
  if (confirm('Удалить этот предмет / чтение из программы?')) {
    currentUser.studyActivities = (currentUser.studyActivities || []).filter(a => a.id !== actId);
    saveCurrentUser();
    renderStudy();
    renderReport();
  }
}

function openChangeTargetModalStudy(actId, curTarget, unit) {
  document.getElementById('editStudyActivityId').value = actId;
  document.getElementById('newStudyTargetInput').value = curTarget || 20;
  const lbl = document.getElementById('studyTargetModalLabel');
  if (lbl) lbl.textContent = `Цель на день (${unit || 'задач / стр'})`;
  document.getElementById('studyTargetModal').classList.remove('hidden');
}

function closeStudyTargetModal() {
  document.getElementById('studyTargetModal').classList.add('hidden');
}

function saveNewStudyTarget(e) {
  e.preventDefault();
  const actId = document.getElementById('editStudyActivityId').value;
  const val = parseInt(document.getElementById('newStudyTargetInput').value, 10);
  if (val >= 1) {
    const act = (currentUser.studyActivities || []).find(a => a.id === actId);
    if (act) act.target = val;
    saveCurrentUser();
    closeStudyTargetModal();
    renderStudy();
    renderReport();
  }
}

function openAddStudySetModal(actId, actName) {
  document.getElementById('studySetActivityId').value = actId;
  const titleEl = document.getElementById('studySetModalTitle');
  if (titleEl) titleEl.textContent = `Сессия: ${actName}`;
  document.getElementById('studySetModal').classList.remove('hidden');
}

function closeStudySetModal() {
  document.getElementById('studySetModal').classList.add('hidden');
}

function saveStudySet(e) {
  e.preventDefault();
  const actId = document.getElementById('studySetActivityId').value;
  const duration = parseInt(document.getElementById('studySetDurationInput').value, 10) || 45;
  const volume = parseInt(document.getElementById('studySetVolumeInput').value, 10) || 10;

  const todayKey = getTodayDateKey();
  initUserStudyActivities();
  const actData = currentUser.studyLogs[todayKey].activities[actId];
  const act = (currentUser.studyActivities || []).find(a => a.id === actId);
  if (actData && act) {
    if (!actData.sets) actData.sets = [];
    actData.sets.push({ duration, volume });
    if (actData.sets.length >= act.target) {
      actData.completed = true;
    }
    saveCurrentUser();
    closeStudySetModal();
    renderStudy();
    renderReport();
  }
}

function deleteStudySet(actId, setIdx) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  initUserStudyActivities();
  const actData = currentUser.studyLogs[todayKey].activities[actId];
  if (actData && actData.sets) {
    actData.sets.splice(setIdx, 1);
    const act = (currentUser.studyActivities || []).find(a => a.id === actId);
    if (act && actData.sets.length < act.target) {
      actData.completed = false;
    }
    saveCurrentUser();
    renderStudy();
    renderReport();
  }
}

function renderStudyHistory() {
  const container = document.getElementById('studyHistoryList');
  if (!container || !currentUser || !currentUser.studyLogs) return;
  container.innerHTML = '';

  const daysToShow = 7;
  const dates = [];
  const now = new Date();
  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(formatDateKey(d));
  }

  dates.forEach(dateKey => {
    const log = currentUser.studyLogs[dateKey];
    const isToday = dateKey === getTodayDateKey();
    const dateObj = new Date(dateKey);
    const dateTitle = isToday ? 'Сегодня' : dateObj.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });

    let isSuccess = log && log.status === 'success';
    let summaryText = 'Нет данных';

    if (log && log.activities) {
      const parts = [];
      Object.keys(log.activities).forEach(actId => {
        const act = (currentUser.studyActivities || []).find(a => a.id === actId);
        const data = log.activities[actId];
        if (act && data) {
          if (act.type === 'reps' && data.done > 0) {
            parts.push(`${act.icon || '📚'} ${data.done} ${act.unit || 'задач'}`);
          } else if (act.type === 'sets' && data.sets && data.sets.length > 0) {
            parts.push(`${act.icon || '⏱️'} ${data.sets.length} сессий`);
          }
        }
      });
      if (parts.length > 0) summaryText = parts.join(' • ');
    }

    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div>
        <div class="hist-date">${dateTitle} ${isToday ? '⭐' : ''}</div>
        <div class="hist-reps">${summaryText}</div>
      </div>
      <div>
        <span class="hist-status ${isSuccess ? 'success' : 'fail'}">
          ${isSuccess ? '✓ Закрыто' : 'Пропущено'}
        </span>
      </div>
    `;
    container.appendChild(row);
  });
}

function getScheduleStudyExercises() {
  if (!currentUser || !currentUser.scheduleSlots) return [];
  const studySlots = currentUser.scheduleSlots.filter(s => {
    if (s.category === 'work') return true;
    const cat = (currentUser.customCategories || []).find(c => c.id === s.category);
    if (cat && (cat.name.toLowerCase().includes('учеб') || cat.name.toLowerCase().includes('книг') || cat.name.toLowerCase().includes('чтен') || cat.name.toLowerCase().includes('acca'))) return true;
    const hasStudyEx = (s.exercises || []).some(ex => {
      const exLower = (ex.name || '').toLowerCase();
      return (currentUser.studyActivities || []).some(sa => sa.name.toLowerCase() === exLower) ||
             (currentUser.books || []).some(b => b.title.toLowerCase() === exLower || exLower.includes(b.title.toLowerCase()));
    });
    return hasStudyEx;
  });
  const result = [];
  studySlots.forEach(slot => {
    const exs = slot.exercises || [];
    exs.forEach(ex => {
      const sets = parseInt(ex.sets, 10) || 1;
      const target = parseInt(ex.target, 10) || 10;
      const unit = ex.unit || 'задач';
      const isCountUnit = unit === 'задач' || unit === 'стр' || unit === 'мин' || unit === 'раз' || unit === 'сек' || unit === 'сессий' || unit === 'глав';
      const totalPlan = isCountUnit ? (sets * target) : sets;

      result.push({
        slotId: slot.id,
        slotName: slot.name,
        slotTime: `${slot.start} - ${slot.end}`,
        name: ex.name,
        sets,
        target,
        unit,
        totalPlan
      });
    });
  });
  return result;
}

function renderScheduleStudyComparison() {
  const container = document.getElementById('scheduleStudyComparisonList');
  if (!container || !currentUser) return;
  container.innerHTML = '';

  const studyExercises = getScheduleStudyExercises();
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = { status: 'pending', activities: {}, scheduleDone: {}, scheduleSets: {} };
  }
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};

  if (studyExercises.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px 14px; text-align: center; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--border);">
        <div style="font-size: 26px; margin-bottom: 6px;">📖</div>
        <div style="font-size: 14px; font-weight: 700;">В блоках учёты пока нет заданий</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
          Откройте вкладку «Расписание», нажмите на блок категории «Работа / Учёба» и добавьте задания по ACCA или чтению!
        </div>
      </div>
    `;
    return;
  }

  studyExercises.forEach((item, exIdx) => {
    const key = item.name;
    const cardId = 'sc_study_' + exIdx + '_' + (item.slotId || 'slot');

    let setsArr = todayLog.scheduleSets[key];
    if (!Array.isArray(setsArr)) {
      const count = Math.max(1, item.sets || 1);
      setsArr = [];
      const prevDone = todayLog.scheduleDone[key];
      if (prevDone !== undefined && prevDone > 0) {
        if (prevDone === item.totalPlan && item.sets > 0) {
          for (let i = 0; i < count; i++) setsArr.push(item.target);
        } else {
          let rem = prevDone;
          for (let i = 0; i < count; i++) {
            const val = Math.min(item.target, rem);
            setsArr.push(val);
            rem -= val;
          }
          if (rem > 0 && setsArr.length > 0) setsArr[setsArr.length - 1] += rem;
        }
      } else {
        for (let i = 0; i < count; i++) setsArr.push(0);
      }
      todayLog.scheduleSets[key] = setsArr;
    }

    while (setsArr.length < item.sets) {
      setsArr.push(0);
    }

    const totalFact = setsArr.reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
    todayLog.scheduleDone[key] = totalFact;

    const totalPlan = item.totalPlan;
    const diff = totalFact - totalPlan;
    const isCompleted = totalFact >= totalPlan;
    const pct = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;

    let diffBadgeHtml = '';
    if (diff < 0) {
      const remaining = Math.abs(diff);
      diffBadgeHtml = `<span class="diff-badge diff-remaining">Осталось: ${remaining} ${item.unit} (${pct}%) ⏳</span>`;
    } else if (diff === 0) {
      diffBadgeHtml = `<span class="diff-badge diff-exact">✓ Выполнено в точности (100%) 🎯</span>`;
    } else {
      diffBadgeHtml = `<span class="diff-badge diff-over">Перевыполнено: +${diff} ${item.unit} (${pct}%) 🔥</span>`;
    }

    const stepDelta = (item.unit === 'мин' ? 15 : (item.unit === 'стр' ? 5 : 1));
    const setsRowsHtml = setsArr.map((val, sIdx) => {
      const setNumber = sIdx + 1;
      const isTargetHit = (val === item.target && val > 0);
      const isOverHit = (val > item.target);
      const canDelete = setsArr.length > item.sets;

      return `
        <div class="sched-set-row ${isTargetHit ? 'set-hit' : (isOverHit ? 'set-over' : '')}">
          <div class="sched-set-label-wrap">
            <span class="sched-set-badge">${setNumber}-я сессия</span>
            ${isTargetHit ? '<span class="sched-set-status-hit" title="Норма выполнена!">✓</span>' : (isOverHit ? '<span class="sched-set-status-over" title="Перевыполнено!">🔥</span>' : '')}
          </div>

          <div class="sched-set-controls">
            <button type="button" class="sched-set-step-btn" title="Уменьшить" onclick="stepScheduleStudySetVal('${escapeHtml(item.name)}', ${sIdx}, -${stepDelta})">−</button>
            <input type="number" 
                   class="sched-set-input" 
                   value="${val}" 
                   min="0" 
                   onfocus="this.select()"
                   oninput="handleScheduleStudySetInput(this, '${escapeHtml(item.name)}', ${sIdx}, ${totalPlan}, '${item.unit}', '${cardId}')"
                   onchange="setScheduleStudySetVal('${escapeHtml(item.name)}', ${sIdx}, this.value)">
            <button type="button" class="sched-set-step-btn" title="Увеличить" onclick="stepScheduleStudySetVal('${escapeHtml(item.name)}', ${sIdx}, ${stepDelta})">+</button>
            <button type="button" class="sched-set-target-btn" title="Поставить план ${item.target} ${item.unit}" onclick="setScheduleStudySetVal('${escapeHtml(item.name)}', ${sIdx}, ${item.target})">=${item.target}</button>
            <span class="sched-set-unit">${item.unit}</span>
            ${canDelete ? `
              <button type="button" class="sched-set-del-btn" title="Удалить сессию" onclick="removeScheduleStudySet('${escapeHtml(item.name)}', ${sIdx})">✕</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const card = document.createElement('div');
    card.className = `schedule-comparison-item ${isCompleted ? 'completed' : ''}`;
    card.id = `sched-card-${cardId}`;
    card.innerHTML = `
      <div class="sched-comp-top">
        <div>
          <div class="sched-comp-title">
            <span>📚</span>
            <span>${escapeHtml(item.name)}</span>
          </div>
          <div class="sched-comp-slot-tag">Блок расписания: ${escapeHtml(item.slotName)} (${item.slotTime})</div>
        </div>
        <div id="sched-badge-${cardId}">
          ${diffBadgeHtml}
        </div>
      </div>

      <div class="sched-comp-grid">
        <div class="sched-comp-col">
          <span class="sched-comp-col-label">План из расписания</span>
          <span class="sched-comp-plan-val">${item.sets} сессий × ${item.target} ${item.unit} <b>(= ${totalPlan} ${item.unit})</b></span>
        </div>

        <div class="sched-comp-col">
          <span class="sched-comp-col-label">Факт (сумма сессий)</span>
          <div class="sched-comp-fact-total" id="sched-fact-${cardId}">
            <b>${totalFact}</b> ${item.unit}
          </div>
        </div>

        <div class="sched-comp-col">
          <span class="sched-comp-col-label">Разница (Факт − План)</span>
          <div id="sched-diff-${cardId}" style="font-size: 14px; font-weight: 800; color: ${diff >= 0 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">
            ${diff > 0 ? `+${diff}` : diff} ${item.unit}
          </div>
        </div>
      </div>

      <div class="today-rep-bar-bg" style="margin-top: 8px;">
        <div id="sched-bar-${cardId}" class="today-rep-bar-fill" style="width: ${Math.min(100, pct)}%; background: ${isCompleted ? 'var(--accent-green)' : (totalFact > 0 ? 'linear-gradient(90deg, #4f46e5, #06b6d4)' : 'rgba(255,255,255,0.2)')};"></div>
      </div>

      <div class="sched-sets-breakdown-box">
        <div class="sched-sets-header">
          <div class="sched-sets-header-title">
            <span>⏱️ По учебным сессиям (план: ${item.sets} по ${item.target} ${item.unit}):</span>
          </div>
          <div class="sched-sets-header-actions">
            <button type="button" class="sched-quick-action-btn" title="Заполнить все сессии плановым количеством" onclick="fillScheduleStudySetsWithTarget('${escapeHtml(item.name)}', ${item.target})">
              ⚡ Все по ${item.target}
            </button>
            <button type="button" class="sched-quick-action-btn add-btn" title="Добавить еще одну сессию" onclick="addScheduleExtraStudySet('${escapeHtml(item.name)}')">
              + Сессия
            </button>
          </div>
        </div>

        <div class="sched-sets-grid">
          ${setsRowsHtml}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function handleScheduleStudySetInput(inputEl, exName, setIndex, totalPlan, unit, cardId) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = { status: 'pending', activities: {}, scheduleDone: {}, scheduleSets: {} };
  }
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  while (todayLog.scheduleSets[exName].length <= setIndex) todayLog.scheduleSets[exName].push(0);

  const num = Math.max(0, parseInt(inputEl.value, 10) || 0);
  todayLog.scheduleSets[exName][setIndex] = num;

  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;

  // Live update card DOM
  const factEl = document.getElementById(`sched-fact-${cardId}`);
  if (factEl) factEl.innerHTML = `<b>${totalFact}</b> ${unit}`;

  const diff = totalFact - totalPlan;
  const diffEl = document.getElementById(`sched-diff-${cardId}`);
  if (diffEl) {
    diffEl.textContent = `${diff > 0 ? '+' + diff : diff} ${unit}`;
    diffEl.style.color = diff >= 0 ? 'var(--accent-green)' : 'var(--accent-yellow)';
  }

  const pct = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;
  const isCompleted = totalFact >= totalPlan;

  const badgeEl = document.getElementById(`sched-badge-${cardId}`);
  if (badgeEl) {
    if (diff < 0) {
      badgeEl.innerHTML = `<span class="diff-badge diff-remaining">Осталось: ${Math.abs(diff)} ${unit} (${pct}%) ⏳</span>`;
    } else if (diff === 0) {
      badgeEl.innerHTML = `<span class="diff-badge diff-exact">✓ Выполнено в точности (100%) 🎯</span>`;
    } else {
      badgeEl.innerHTML = `<span class="diff-badge diff-over">Перевыполнено: +${diff} ${unit} (${pct}%) 🔥</span>`;
    }
  }

  const barEl = document.getElementById(`sched-bar-${cardId}`);
  if (barEl) {
    barEl.style.width = `${Math.min(100, pct)}%`;
    barEl.style.background = isCompleted ? 'var(--accent-green)' : (totalFact > 0 ? 'linear-gradient(90deg, #4f46e5, #06b6d4)' : 'rgba(255,255,255,0.2)');
  }

  const cardEl = document.getElementById(`sched-card-${cardId}`);
  if (cardEl) {
    if (isCompleted) cardEl.classList.add('completed');
    else cardEl.classList.remove('completed');
  }

  syncScheduleStudyWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderBooks();
}

function setScheduleStudySetVal(exName, setIndex, val) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = { status: 'pending', activities: {}, scheduleDone: {}, scheduleSets: {} };
  }
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  while (todayLog.scheduleSets[exName].length <= setIndex) todayLog.scheduleSets[exName].push(0);

  const num = Math.max(0, parseInt(val, 10) || 0);
  todayLog.scheduleSets[exName][setIndex] = num;

  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;

  syncScheduleStudyWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderBooks();
  renderScheduleStudyComparison();
  renderStudy();
  renderTodayStudyReport();
}

function stepScheduleStudySetVal(exName, setIndex, delta) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  if (!currentUser.studyLogs[todayKey]) {
    currentUser.studyLogs[todayKey] = { status: 'pending', activities: {}, scheduleDone: {}, scheduleSets: {} };
  }
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  while (todayLog.scheduleSets[exName].length <= setIndex) todayLog.scheduleSets[exName].push(0);

  const cur = parseInt(todayLog.scheduleSets[exName][setIndex], 10) || 0;
  const next = Math.max(0, cur + delta);
  setScheduleStudySetVal(exName, setIndex, next);
}

function fillScheduleStudySetsWithTarget(exName, targetVal) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  for (let i = 0; i < todayLog.scheduleSets[exName].length; i++) {
    todayLog.scheduleSets[exName][i] = targetVal;
  }
  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;
  syncScheduleStudyWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderBooks();
  renderScheduleStudyComparison();
  renderStudy();
  renderTodayStudyReport();
}

function addScheduleExtraStudySet(exName) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.scheduleSets) todayLog.scheduleSets = {};
  if (!Array.isArray(todayLog.scheduleSets[exName])) todayLog.scheduleSets[exName] = [];
  todayLog.scheduleSets[exName].push(0);
  saveCurrentUser();
  renderBooks();
  renderScheduleStudyComparison();
  renderTodayStudyReport();
}

function removeScheduleStudySet(exName, setIndex) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  if (!currentUser.studyLogs) currentUser.studyLogs = {};
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.scheduleSets || !Array.isArray(todayLog.scheduleSets[exName])) return;
  todayLog.scheduleSets[exName].splice(setIndex, 1);
  const totalFact = todayLog.scheduleSets[exName].reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  todayLog.scheduleDone[exName] = totalFact;
  syncScheduleStudyWithCatalog(exName, totalFact, todayLog.scheduleSets[exName]);
  saveCurrentUser();
  renderBooks();
  renderScheduleStudyComparison();
  renderStudy();
  renderTodayStudyReport();
}

function syncScheduleStudyWithCatalog(exName, totalFact, setsArray) {
  if (!currentUser) return;
  const todayKey = getTodayDateKey();
  initUserStudyActivities();
  const todayLog = currentUser.studyLogs[todayKey];
  if (!todayLog.bookPages) todayLog.bookPages = {};

  const matchedAct = (currentUser.studyActivities || []).find(a => a.name.toLowerCase() === exName.toLowerCase());
  if (matchedAct) {
    if (!todayLog.activities[matchedAct.id]) {
      todayLog.activities[matchedAct.id] = (matchedAct.type === 'sets' ? { sets: [], completed: false } : { done: 0, completed: false });
    }
    const actData = todayLog.activities[matchedAct.id];
    if (matchedAct.type === 'sets') {
      const existingSets = actData.sets || [];
      actData.sets = (setsArray || []).map((val, i) => ({
        duration: (existingSets[i] && existingSets[i].duration !== undefined) ? existingSets[i].duration : 45,
        volume: val
      }));
      actData.completed = (totalFact >= (matchedAct.target || 1));
    } else {
      actData.done = totalFact;
      actData.completed = (totalFact >= (matchedAct.target || 1));
    }
  }

  // Sync with matching book in currentUser.books
  const exLower = (exName || '').toLowerCase();
  const matchedBook = (currentUser.books || []).find(b => {
    const bTitle = (b.title || '').toLowerCase();
    return bTitle === exLower || 
           (bTitle.length > 5 && exLower.includes(bTitle)) || 
           (exLower.length > 5 && bTitle.includes(exLower)) ||
           ((exLower.includes('чтени') || exLower.includes('книг')) && currentUser.books.length === 1);
  });

  if (matchedBook) {
    todayLog.bookPages[matchedBook.id] = totalFact;
    const base = (matchedBook.basePage !== undefined) ? matchedBook.basePage : (matchedBook.currentPage || 0);
    matchedBook.currentPage = Math.min(matchedBook.totalPages, Math.max(0, base + totalFact));
    matchedBook.status = (matchedBook.currentPage >= matchedBook.totalPages) ? 'completed' : 'reading';
  }
}

function renderTodayStudyReport() {
  const container = document.getElementById('todayStudyReportList');
  if (!container || !currentUser) return;
  container.innerHTML = '';

  const todayKey = getTodayDateKey();
  const todayLog = (currentUser.studyLogs && currentUser.studyLogs[todayKey]) || { activities: {}, scheduleDone: {}, scheduleSets: {} };
  if (!todayLog.scheduleDone) todayLog.scheduleDone = {};

  const studyExercises = getScheduleStudyExercises();

  const todaySub = document.getElementById('studyTodaySubtitle');
  if (todaySub) {
    todaySub.textContent = `План из расписания на ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  }

  if (studyExercises.length === 0) {
    container.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 13px;">
        В блоках категории «Работа / Учёба» на сегодня нет заданий.
      </div>
    `;
    return;
  }

  studyExercises.forEach(item => {
    let factDone = todayLog.scheduleDone[item.name];
    if (factDone === undefined) {
      const matchedAct = (currentUser.studyActivities || []).find(a => a.name.toLowerCase() === item.name.toLowerCase());
      if (matchedAct && todayLog.activities && todayLog.activities[matchedAct.id]) {
        const actData = todayLog.activities[matchedAct.id];
        factDone = matchedAct.type === 'sets' ? ((actData.sets && actData.sets.length) || 0) : (actData.done || 0);
      } else {
        factDone = 0;
      }
    }

    const totalPlan = item.totalPlan;
    const diff = factDone - totalPlan;
    const isCompleted = factDone >= totalPlan;
    const pct = totalPlan > 0 ? Math.round((factDone / totalPlan) * 100) : 0;

    let badgeHtml = '';
    if (diff < 0) {
      badgeHtml = `<span class="rep-badge in-progress">Осталось: ${Math.abs(diff)} ${item.unit} (${pct}%)</span>`;
    } else if (diff === 0) {
      badgeHtml = `<span class="rep-badge done">✓ Выполнено в точности (100%)</span>`;
    } else {
      badgeHtml = `<span class="rep-badge done">🔥 Перевыполнено (+${diff} ${item.unit})</span>`;
    }

    let setsBreakdownHtml = '';
    if (todayLog.scheduleSets && Array.isArray(todayLog.scheduleSets[item.name]) && todayLog.scheduleSets[item.name].length > 0) {
      const chips = todayLog.scheduleSets[item.name].map((sVal, idx) => {
        return `<span class="report-set-chip">${idx + 1}-я: <b>${sVal}</b></span>`;
      }).join(' ');
      setsBreakdownHtml = `
        <div class="report-sets-breakdown">
          <span style="font-size: 11px; color: var(--text-dim); margin-right: 4px; align-self: center;">По сессиям:</span>
          ${chips}
        </div>
      `;
    }

    const row = document.createElement('div');
    row.className = `today-workout-report-item ${isCompleted ? 'done' : ''}`;
    row.innerHTML = `
      <div class="today-rep-top">
        <div class="today-rep-name">
          <span>📚</span>
          <span>${escapeHtml(item.name)}</span>
          <span style="font-size: 11px; font-weight: 500; color: var(--text-dim);">(${escapeHtml(item.slotName)})</span>
        </div>
        ${badgeHtml}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; flex-wrap: wrap; gap: 4px;">
        <span style="color: #a5b4fc;">План: <b>${item.sets} сессий × ${item.target} ${item.unit} (${totalPlan} ${item.unit})</b></span>
        <span>Факт: <b>${factDone} ${item.unit}</b> (Разница: <b style="color: ${diff >= 0 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">${diff > 0 ? `+${diff}` : diff}</b>)</span>
      </div>
      ${setsBreakdownHtml}
      <div class="today-rep-bar-bg" style="margin-top: 6px;">
        <div class="today-rep-bar-fill" style="width: ${Math.min(100, pct)}%; background: ${isCompleted ? 'var(--accent-green)' : (factDone > 0 ? 'linear-gradient(90deg, #4f46e5, #06b6d4)' : 'rgba(255,255,255,0.2)')};"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

/* =========================================================
   STEAM ACHIEVEMENTS SYSTEM (ДОСТИЖЕНИЯ КАК В STEAM)
   ========================================================= */

const DEFAULT_ACHIEVEMENTS = [
  // --- 📚 ЧТЕНИЕ И КНИГИ ---
  {
    id: 'ach_read_50',
    icon: '📖',
    title: 'Первые строки',
    desc: 'Прочитать первые 50 страниц в трекере',
    tier: 'bronze',
    category: 'reading',
    metric: 'pages',
    target: 50,
    unlockedBy: ['shahboz']
  },
  {
    id: 'ach_book_1',
    icon: '📕',
    title: 'Книжный дебют',
    desc: 'Полностью прочитать 1-ю книгу',
    tier: 'bronze',
    category: 'reading',
    metric: 'books',
    target: 1,
    unlockedBy: ['shahboz']
  },
  {
    id: 'ach_read_1000',
    icon: '📚',
    title: 'Книжный червь',
    desc: 'Прочитать суммарно 1 000 страниц',
    tier: 'silver',
    category: 'reading',
    metric: 'pages',
    target: 1000,
    unlockedBy: []
  },
  {
    id: 'ach_book_10',
    icon: '🏆',
    title: 'Книжная полка',
    desc: 'Полностью прочитать 10 книг',
    tier: 'silver',
    category: 'reading',
    metric: 'books',
    target: 10,
    unlockedBy: []
  },
  {
    id: 'ach_read_5000',
    icon: '🧙‍♂️',
    title: 'Библиотекарь',
    desc: 'Прочитать 5 000 страниц полезной литературы',
    tier: 'gold',
    category: 'reading',
    metric: 'pages',
    target: 5000,
    unlockedBy: []
  },
  {
    id: 'ach_book_100',
    icon: '👑',
    title: 'Легенда чтения',
    desc: 'Закончить 100 книг (элитный читательский клуб)',
    tier: 'platinum',
    category: 'reading',
    metric: 'books',
    target: 100,
    unlockedBy: []
  },

  // --- 📑 УЧЁБА И ACCA ---
  {
    id: 'ach_study_50',
    icon: '📑',
    title: 'Студент ACCA',
    desc: 'Разобрать первые 50 задач или учебных тем',
    tier: 'bronze',
    category: 'study',
    metric: 'study_tasks',
    target: 50,
    unlockedBy: ['shahboz']
  },
  {
    id: 'ach_pomodoro_20',
    icon: '⏱️',
    title: 'Мастер концентрации',
    desc: 'Провести 20 учебных сессий по расписанию',
    tier: 'silver',
    category: 'study',
    metric: 'study_sessions',
    target: 20,
    unlockedBy: []
  },
  {
    id: 'ach_acca_500',
    icon: '🧠',
    title: 'Экзаменационный штурм',
    desc: 'Решить 500 задач из Exam Kit (BPP / Kaplan)',
    tier: 'gold',
    category: 'study',
    metric: 'study_tasks',
    target: 500,
    unlockedBy: []
  },
  {
    id: 'ach_acca_master',
    icon: '💎',
    title: 'Член ассоциации (ACCA Master)',
    desc: 'Завершить всю программу подготовки к экзамену ACCA',
    tier: 'platinum',
    category: 'study',
    metric: 'study_master',
    target: 1,
    unlockedBy: []
  },

  // --- 💪 СПОРТ И ТРЕНИРОВКИ ---
  {
    id: 'ach_rep_100',
    icon: '💥',
    title: 'Первая кровь',
    desc: 'Сделать первые 100 отжиманий суммарно',
    tier: 'bronze',
    category: 'sport',
    metric: 'reps',
    target: 100,
    unlockedBy: ['shahboz']
  },
  {
    id: 'ach_rep_1000',
    icon: '🏋️',
    title: 'Железная сотня',
    desc: 'Сделать 1 000 повторений упражнений',
    tier: 'silver',
    category: 'sport',
    metric: 'reps',
    target: 1000,
    unlockedBy: []
  },
  {
    id: 'ach_rep_5000',
    icon: '⚔️',
    title: 'Спартанец',
    desc: 'Сделать 5 000 чистых повторений',
    tier: 'gold',
    category: 'sport',
    metric: 'reps',
    target: 5000,
    unlockedBy: []
  },
  {
    id: 'ach_rep_10000',
    icon: '🦾',
    title: 'Титановый атлет',
    desc: 'Сделать 10 000 чистых повторений (машина дисциплины)',
    tier: 'platinum',
    category: 'sport',
    metric: 'reps',
    target: 10000,
    unlockedBy: []
  },

  // --- ⚡ ДИСЦИПЛИНА И РАСПИСАНИЕ ---
  {
    id: 'ach_clean_day',
    icon: '🛡️',
    title: 'Чистый лист',
    desc: 'Закрыть день по расписанию без единого штрафа',
    tier: 'bronze',
    category: 'discipline',
    metric: 'clean_days',
    target: 1,
    unlockedBy: ['shahboz']
  },
  {
    id: 'ach_streak_7',
    icon: '🔥',
    title: 'Неделя без пощады',
    desc: 'Удержать 7 дней дисциплинарного стрика',
    tier: 'silver',
    category: 'discipline',
    metric: 'streak',
    target: 7,
    unlockedBy: []
  },
  {
    id: 'ach_streak_30',
    icon: '🌟',
    title: 'Месяц стали',
    desc: '30 дней непрерывного соблюдения расписания',
    tier: 'gold',
    category: 'discipline',
    metric: 'streak',
    target: 30,
    unlockedBy: []
  },
  {
    id: 'ach_streak_100',
    icon: '👑',
    title: 'Властелин времени',
    desc: '100 дней железной дисциплины и 0 сум штрафов',
    tier: 'platinum',
    category: 'discipline',
    metric: 'streak',
    target: 100,
    unlockedBy: []
  }
];

function getAchievements() {
  try {
    const raw = localStorage.getItem(APP_ACHIEVEMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_ACHIEVEMENTS));
}

function saveAchievements(catalog) {
  try {
    localStorage.setItem(APP_ACHIEVEMENTS_KEY, JSON.stringify(catalog));
  } catch (e) {}
}

function initAchievements() {
  const existing = localStorage.getItem(APP_ACHIEVEMENTS_KEY);
  if (!existing) {
    saveAchievements(DEFAULT_ACHIEVEMENTS);
  }
  updateTrophyTopBadge();
}

function checkAutomaticAchievements() {
  if (!currentUser) return;
  const username = (currentUser.username || 'shahboz').toLowerCase();
  const achievements = getAchievements();
  let updated = false;

  // Compute stats
  let totalPagesRead = 0;
  (currentUser.books || []).forEach(b => {
    totalPagesRead += (parseInt(b.currentPage, 10) || 0);
  });
  if (currentUser.studyLogs) {
    Object.values(currentUser.studyLogs).forEach(log => {
      if (log.bookPages) {
        Object.values(log.bookPages).forEach(p => { totalPagesRead += (parseInt(p, 10) || 0); });
      }
    });
  }

  let booksCompleted = 0;
  (currentUser.books || []).forEach(b => {
    if (b.status === 'completed' || (parseInt(b.currentPage, 10) >= parseInt(b.totalPages, 10))) {
      booksCompleted++;
    }
  });

  let totalReps = 0;
  if (currentUser.workoutLogs) {
    Object.values(currentUser.workoutLogs).forEach(log => {
      if (log.exercises) {
        Object.values(log.exercises).forEach(ex => {
          totalReps += (parseInt(ex.done, 10) || 0);
        });
      }
    });
  }

  let totalStudyTasks = 0;
  let totalStudySessions = 0;
  if (currentUser.studyLogs) {
    Object.values(currentUser.studyLogs).forEach(log => {
      if (log.scheduleDone) {
        Object.values(log.scheduleDone).forEach(val => { totalStudyTasks += (parseInt(val, 10) || 0); });
      }
      if (log.scheduleSets) {
        Object.values(log.scheduleSets).forEach(arr => {
          if (Array.isArray(arr)) totalStudySessions += arr.filter(v => v > 0).length;
        });
      }
    });
  }

  let cleanDays = 0;
  if (currentUser.workoutLogs) {
    Object.values(currentUser.workoutLogs).forEach(log => {
      if (log.status === 'success' || (log.penalty === 0 && log.exercises && Object.keys(log.exercises).length > 0)) {
        cleanDays++;
      }
    });
  }

  const streak = currentUser.streak || currentUser.studyStreak || 0;

  achievements.forEach(ach => {
    if (!ach.unlockedBy) ach.unlockedBy = [];
    const isUnlocked = ach.unlockedBy.some(u => u.toLowerCase() === username);
    if (!isUnlocked) {
      let meetsCondition = false;
      if (ach.metric === 'pages' && totalPagesRead >= ach.target) meetsCondition = true;
      if (ach.metric === 'books' && booksCompleted >= ach.target) meetsCondition = true;
      if (ach.metric === 'reps' && totalReps >= ach.target) meetsCondition = true;
      if (ach.metric === 'study_tasks' && totalStudyTasks >= ach.target) meetsCondition = true;
      if (ach.metric === 'study_sessions' && totalStudySessions >= ach.target) meetsCondition = true;
      if (ach.metric === 'clean_days' && cleanDays >= ach.target) meetsCondition = true;
      if (ach.metric === 'streak' && streak >= ach.target) meetsCondition = true;

      if (meetsCondition) {
        ach.unlockedBy.push(username);
        updated = true;
      }
    }
  });

  if (updated) {
    saveAchievements(achievements);
    playHapticSound('targetAchieved');
  }
}

function updateTrophyTopBadge() {
  if (!currentUser) return;
  const username = (currentUser.username || 'shahboz').toLowerCase();
  const achievements = getAchievements();
  const userUnlocked = achievements.filter(a => (a.unlockedBy || []).some(u => u.toLowerCase() === username));
  const badge = document.getElementById('topAchBadge');
  if (badge) {
    badge.textContent = userUnlocked.length;
  }
}

function openAchievementsModal() {
  checkAutomaticAchievements();
  renderAchievements();
  document.getElementById('achievementsModal').classList.remove('hidden');
}

function closeAchievementsModal() {
  document.getElementById('achievementsModal').classList.add('hidden');
}

function setAchievementFilter(filter) {
  currentAchievementFilter = filter;
  ['all', 'reading', 'study', 'sport', 'discipline', 'unlocked'].forEach(f => {
    const btn = document.getElementById(`achFilter_${f}`);
    if (btn) {
      if (f === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  renderAchievements();
}

function renderAchievements() {
  const container = document.getElementById('steamAchievementsList');
  if (!container) return;
  container.innerHTML = '';

  const username = currentUser ? (currentUser.username || 'shahboz').toLowerCase() : 'shahboz';
  const achievements = getAchievements();

  // Overall stats
  const totalCount = achievements.length;
  const unlockedCount = achievements.filter(a => (a.unlockedBy || []).some(u => u.toLowerCase() === username)).length;
  const overallPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const counterEl = document.getElementById('steamTrophyCounter');
  if (counterEl) counterEl.textContent = `${unlockedCount} / ${totalCount} (${overallPct}%)`;

  const barEl = document.getElementById('steamOverallProgressBar');
  if (barEl) barEl.style.width = `${overallPct}%`;

  updateTrophyTopBadge();

  // Filter
  const filtered = achievements.filter(ach => {
    if (currentAchievementFilter === 'all') return true;
    if (currentAchievementFilter === 'unlocked') return (ach.unlockedBy || []).some(u => u.toLowerCase() === username);
    return ach.category === currentAchievementFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 13px;">
        В этой категории достижений пока не найдено.
      </div>
    `;
    return;
  }

  // Get current user progress stats for display
  let totalPagesRead = 0;
  (currentUser.books || []).forEach(b => { totalPagesRead += (parseInt(b.currentPage, 10) || 0); });
  let booksCompleted = (currentUser.books || []).filter(b => b.status === 'completed' || parseInt(b.currentPage, 10) >= parseInt(b.totalPages, 10)).length;
  let totalReps = 0;
  if (currentUser.workoutLogs) {
    Object.values(currentUser.workoutLogs).forEach(l => {
      if (l.exercises) Object.values(l.exercises).forEach(e => { totalReps += (parseInt(e.done, 10) || 0); });
    });
  }

  filtered.forEach(ach => {
    const isUnlocked = (ach.unlockedBy || []).some(u => u.toLowerCase() === username);
    const tierLabels = {
      bronze: '🥉 Бронза',
      silver: '🥈 Серебро',
      gold: '🥇 Золото',
      platinum: '💎 Платина'
    };

    // Calculate progress value
    let curVal = 0;
    if (ach.metric === 'pages') curVal = totalPagesRead;
    else if (ach.metric === 'books') curVal = booksCompleted;
    else if (ach.metric === 'reps') curVal = totalReps;
    else if (ach.metric === 'streak') curVal = currentUser.streak || 0;
    else curVal = isUnlocked ? ach.target : 0;

    const progPct = Math.min(100, Math.round((curVal / ach.target) * 100));

    // Users list
    const usersChipsHtml = (ach.unlockedBy && ach.unlockedBy.length > 0)
      ? ach.unlockedBy.map(u => `<span class="steam-user-chip">👤 @${escapeHtml(u)}</span>`).join('')
      : '<span style="color: var(--text-dim);">Пока никто не достиг</span>';

    const card = document.createElement('div');
    card.className = `steam-ach-card tier-${ach.tier} ${isUnlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <div class="steam-ach-main">
        <div class="steam-ach-icon-box" title="${isUnlocked ? 'Разблокировано!' : 'Заблокировано'}">
          ${isUnlocked ? ach.icon : '🔒'}
        </div>
        <div class="steam-ach-info">
          <div class="steam-ach-header">
            <span class="steam-tier-badge">${tierLabels[ach.tier] || ach.tier}</span>
            <span style="font-size: 11px; font-weight: 700; color: ${isUnlocked ? 'var(--accent-green)' : 'var(--text-dim)'};">
              ${isUnlocked ? '✓ Разблокировано 🏆' : '🔒 Заблокировано'}
            </span>
          </div>
          <div class="steam-ach-title">${escapeHtml(ach.title)}</div>
          <div class="steam-ach-desc">${escapeHtml(ach.desc)}</div>

          <div class="steam-ach-progress-wrap">
            <div class="steam-ach-progress-text">
              <span>Прогресс: <b>${Math.min(curVal, ach.target)}</b> / <b>${ach.target}</b></span>
              <span>${progPct}%</span>
            </div>
            <div class="today-rep-bar-bg" style="height: 6px;">
              <div class="today-rep-bar-fill" style="width: ${progPct}%; background: ${isUnlocked ? 'var(--accent-green)' : 'linear-gradient(90deg, #6366f1, #06b6d4)'};"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="steam-users-section">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span style="font-weight: 700; color: var(--text-muted);">🏆 Получили:</span>
          <div class="steam-users-chips-list">
            ${usersChipsHtml}
          </div>
        </div>
        <button type="button" class="steam-tag-btn" onclick="toggleAchievementForUser('${ach.id}')" title="Добавить или снять пользователя с этого достижения">
          + Отметить пользователя
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleAchievementForUser(achId) {
  const achievements = getAchievements();
  const ach = achievements.find(a => a.id === achId);
  if (!ach) return;

  const defaultSuggest = currentUser ? currentUser.username : 'shahboz';
  const inputUser = prompt(`🏆 Достижение: «${ach.title}»\n\nВведите логин пользователя или друга (например: alisher или ${defaultSuggest}), чтобы отметить получение или снять отметку:`, defaultSuggest);
  if (!inputUser || !inputUser.trim()) return;

  const cleanUser = inputUser.trim().replace('@', '').toLowerCase();
  if (!ach.unlockedBy) ach.unlockedBy = [];

  const existingIdx = ach.unlockedBy.findIndex(u => u.toLowerCase() === cleanUser);
  if (existingIdx >= 0) {
    if (confirm(`Пользователь @${cleanUser} уже имеет это достижение.\n\nСнять достижение с @${cleanUser}?`)) {
      ach.unlockedBy.splice(existingIdx, 1);
    }
  } else {
    ach.unlockedBy.push(cleanUser);
    playHapticSound('targetAchieved');
    alert(`🎉 Достижение «${ach.title}» успешно присвоено пользователю @${cleanUser}!`);
  }

  saveAchievements(achievements);
  renderAchievements();
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

async function forceAppUpdate() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
  } catch (e) {}
  window.location.reload(true);
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
