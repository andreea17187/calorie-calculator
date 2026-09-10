const form = document.querySelector('#calorie-form');
const errorBox = document.querySelector('#form-error');
const resultsPanel = document.querySelector('#results');
const emptyResults = resultsPanel.querySelector('.results-empty');
const resultsContent = resultsPanel.querySelector('.results-content');
const userScopedStorageKeys = new Set([
  'calorie-calculator-journal',
  'calorie-calculator-favorites',
  'calorie-calculator-goals',
  'calorie-calculator-recipes',
  'calorie-calculator-custom-foods'
]);

function getStorageKey(key) {
  if (!userScopedStorageKeys.has(key)) return key;
  try {
    const session = JSON.parse(localStorage.getItem('calorie-calculator-session') || 'null');
    return session?.email ? `${key}::${encodeURIComponent(session.email)}` : key;
  } catch {
    return key;
  }
}
document.querySelector('#recipe-name').placeholder = 'Denumire mâncare';

const formatNumber = (value) => new Intl.NumberFormat('ro-RO').format(Math.round(value));

function getFormData() {
  const data = new FormData(form);
  return {
    sex: data.get('sex'),
    age: Number(data.get('age')),
    weight: Number(data.get('weight')),
    height: Number(data.get('height')),
    activity: Number(data.get('activity')),
    goal: data.get('goal')
  };
}

function validate(data) {
  if (!data.sex || !data.goal || !data.activity || !data.age || !data.weight || !data.height) {
    return 'Te rugăm să completezi toate câmpurile obligatorii.';
  }
  if (!Number.isFinite(data.age) || data.age < 15 || data.age > 100) {
    return 'Vârsta trebuie să fie între 15 și 100 de ani.';
  }
  if (!Number.isFinite(data.weight) || data.weight < 30 || data.weight > 300) {
    return 'Greutatea trebuie să fie între 30 și 300 kg.';
  }
  if (!Number.isFinite(data.height) || data.height < 100 || data.height > 250) {
    return 'Înălțimea trebuie să fie între 100 și 250 cm.';
  }
  return '';
}

function calculateResults(data) {
  // Mifflin-St Jeor: formula folosește o constantă diferită pentru fiecare sex.
  const sexConstant = data.sex === 'male' ? 5 : -161;
  const bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + sexConstant;
  const maintenance = bmr * data.activity;
  const goalMultiplier = { lose: 0.85, maintain: 1, gain: 1.1 }[data.goal];
  const recommended = maintenance * goalMultiplier;

  // Proteinele sunt raportate la greutate, iar grăsimile ocupă 25% din energie.
  const protein = data.weight * 1.8;
  const fats = (recommended * 0.25) / 9;
  const carbs = Math.max(0, (recommended - (protein * 4) - (fats * 9)) / 4);
  return { bmr, maintenance, recommended, protein, carbs, fats };
}

function displayResults(values, shouldScroll = true) {
  document.querySelector('#recommended-calories').textContent = formatNumber(values.recommended);
  document.querySelector('#bmr-value').textContent = `${formatNumber(values.bmr)} kcal`;
  document.querySelector('#maintenance-value').textContent = `${formatNumber(values.maintenance)} kcal`;
  document.querySelector('#protein-value').textContent = `${formatNumber(values.protein)} g`;
  document.querySelector('#carbs-value').textContent = `${formatNumber(values.carbs)} g`;
  document.querySelector('#fats-value').textContent = `${formatNumber(values.fats)} g`;
  emptyResults.hidden = true;
  resultsContent.hidden = false;
  if (shouldScroll) resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = getFormData();
  const error = validate(data);
  errorBox.textContent = error;
  if (error) return;
  saveCalculatorProfile(data);
  displayResults(calculateResults(data));
});

form.addEventListener('reset', () => {
  errorBox.textContent = '';
  emptyResults.hidden = false;
  resultsContent.hidden = true;
});

function applyCalculatorProfile(savedProfile) {
  if (!savedProfile) return;
  const sexInput = document.querySelector(`input[name="sex"][value="${savedProfile.sex}"]`);
  const goalInput = document.querySelector(`input[name="goal"][value="${savedProfile.goal}"]`);
  if (sexInput) sexInput.checked = true;
  if (goalInput) goalInput.checked = true;
  document.querySelector('#age').value = savedProfile.age || '';
  document.querySelector('#weight').value = savedProfile.weight || '';
  document.querySelector('#height').value = savedProfile.height || '';
  document.querySelector('#activity').value = savedProfile.activity || '';
  const error = validate(savedProfile);
  if (!error) displayResults(calculateResults(savedProfile), false);
}

function restoreCalculatorProfile() {
  const journal = readStorage(storageKeys.journal, {});
  const savedProfile = journal.calculatorProfile || readStorage('calorie-calculator-profile', null);
  applyCalculatorProfile(savedProfile);
}

const foodDatabase = {
  oats: { name: 'Fulgi de ovăz', calories: 389, protein: 16.9, carbs: 66.3, fats: 6.9, fiber: 10.6, units: { tablespoon: 8, teaspoon: 3 } },
  chicken: { name: 'Piept de pui', calories: 165, protein: 31, carbs: 0, fats: 3.6, fiber: 0, units: {} },
  egg: { name: 'Ou întreg', calories: 143, protein: 12.6, carbs: 0.7, fats: 9.5, fiber: 0, units: { piece: 50 } },
  rice: { name: 'Orez gătit', calories: 130, protein: 2.7, carbs: 28.2, fats: 0.3, fiber: 0.4, units: { tablespoon: 15 } },
  potato: { name: 'Cartof copt', calories: 93, protein: 2.5, carbs: 21.2, fats: 0.1, fiber: 2.2, units: {} },
  banana: { name: 'Banană', calories: 89, protein: 1.1, carbs: 22.8, fats: 0.3, fiber: 2.6, units: { piece: 118 } },
  apple: { name: 'Măr', calories: 52, protein: 0.3, carbs: 13.8, fats: 0.2, fiber: 2.4, units: { piece: 182 } },
  yogurt: { name: 'Iaurt grecesc', calories: 97, protein: 9, carbs: 3.9, fats: 5, fiber: 0, units: { tablespoon: 15, teaspoon: 5 } },
  yogurt10: { name: 'Iaurt grecesc 10% grăsime', calories: 133, protein: 6.3, carbs: 4.7, fats: 10, fiber: 0, units: { tablespoon: 15, teaspoon: 5 } },
  yogurt2: { name: 'Iaurt grecesc 2% grăsime', calories: 73, protein: 10.3, carbs: 4.1, fats: 2, fiber: 0, units: { tablespoon: 15, teaspoon: 5 } },
  salmon: { name: 'Somon', calories: 208, protein: 20.4, carbs: 0, fats: 13.4, fiber: 0, units: {} },
  lentils: { name: 'Linte gătită', calories: 116, protein: 9, carbs: 20.1, fats: 0.4, fiber: 7.9, units: { tablespoon: 15 } },
  mozzarella: { name: 'Mozzarella', calories: 280, protein: 28, carbs: 3.1, fats: 17, fiber: 0, units: {} },
  tomato: { name: 'Roșie', calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, fiber: 1.2, units: { piece: 123 } },
  honey: { name: 'Miere', calories: 304, protein: 0.3, carbs: 82.4, fats: 0, fiber: 0, units: { tablespoon: 21, teaspoon: 7 } },
  peanutButter: { name: 'Unt de arahide', calories: 588, protein: 25, carbs: 20, fats: 50, fiber: 6, units: { tablespoon: 16, teaspoon: 5 } },
  avocado: { name: 'Avocado', calories: 160, protein: 2, carbs: 8.5, fats: 14.7, fiber: 6.7, units: { piece: 150 } },
  broccoli: { name: 'Broccoli', calories: 34, protein: 2.8, carbs: 6.6, fats: 0.4, fiber: 2.6, units: {} },
  spinach: { name: 'Spanac', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, fiber: 2.2, units: {} },
  cucumber: { name: 'Castravete', calories: 15, protein: 0.7, carbs: 3.6, fats: 0.1, fiber: 0.5, units: { piece: 200 } },
  onion: { name: 'Ceapă', calories: 40, protein: 1.1, carbs: 9.3, fats: 0.1, fiber: 1.7, units: { piece: 110 } },
  tuna: { name: 'Ton în suc propriu', calories: 116, protein: 26, carbs: 0, fats: 1, fiber: 0, units: {} },
  cottageCheese: { name: 'Brânză cottage', calories: 98, protein: 11.1, carbs: 3.4, fats: 4.3, fiber: 0, units: {} },
  feta: { name: 'Brânză feta', calories: 264, protein: 14.2, carbs: 4.1, fats: 21.3, fiber: 0, units: {} },
  milk: { name: 'Lapte', calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3, fiber: 0, units: { glass: 250 } },
  milk3: { name: 'Lapte 3% grăsime', calories: 61, protein: 3.2, carbs: 4.8, fats: 3, fiber: 0, units: { glass: 250 } },
  milk15: { name: 'Lapte 1,5% grăsime', calories: 46, protein: 3.4, carbs: 4.9, fats: 1.5, fiber: 0, units: { glass: 250 } },
  wholegrainBread: { name: 'Pâine integrală', calories: 247, protein: 13, carbs: 41, fats: 4.2, fiber: 7, units: { piece: 35 } },
  pasta: { name: 'Paste gătite', calories: 158, protein: 5.8, carbs: 30.9, fats: 0.9, fiber: 1.8, units: {} },
  quinoa: { name: 'Quinoa gătită', calories: 120, protein: 4.4, carbs: 21.3, fats: 1.9, fiber: 2.8, units: {} },
  strawberry: { name: 'Căpșuni', calories: 32, protein: 0.7, carbs: 7.7, fats: 0.3, fiber: 2, units: { piece: 18 } },
  blueberry: { name: 'Afine', calories: 57, protein: 0.7, carbs: 14.5, fats: 0.3, fiber: 2.4, units: { piece: 2 } },
  raspberry: { name: 'Zmeură', calories: 52, protein: 1.2, carbs: 11.9, fats: 0.7, fiber: 6.5, units: { piece: 4 } },
  nectarine: { name: 'Nectarină', calories: 44, protein: 1.1, carbs: 10.6, fats: 0.3, fiber: 1.7, units: { piece: 140 } },
  orange: { name: 'Portocală', calories: 47, protein: 0.9, carbs: 11.8, fats: 0.1, fiber: 2.4, units: { piece: 130 } },
  pear: { name: 'Pară', calories: 57, protein: 0.4, carbs: 15.2, fats: 0.1, fiber: 3.1, units: { piece: 178 } },
  peach: { name: 'Piersică', calories: 39, protein: 0.9, carbs: 9.5, fats: 0.3, fiber: 1.5, units: { piece: 150 } },
  kiwi: { name: 'Kiwi', calories: 61, protein: 1.1, carbs: 14.7, fats: 0.5, fiber: 3, units: { piece: 75 } },
  mango: { name: 'Mango', calories: 60, protein: 0.8, carbs: 15, fats: 0.4, fiber: 1.6, units: { piece: 200 } },
  pineapple: { name: 'Ananas', calories: 50, protein: 0.5, carbs: 13.1, fats: 0.1, fiber: 1.4, units: {} },
  grapes: { name: 'Struguri', calories: 69, protein: 0.7, carbs: 18.1, fats: 0.2, fiber: 0.9, units: { piece: 5 } },
  carrot: { name: 'Morcov', calories: 41, protein: 0.9, carbs: 9.6, fats: 0.2, fiber: 2.8, units: { piece: 61 } },
  bellPepper: { name: 'Ardei gras', calories: 31, protein: 1, carbs: 6, fats: 0.3, fiber: 2.1, units: { piece: 120 } },
  zucchini: { name: 'Dovlecel', calories: 17, protein: 1.2, carbs: 3.1, fats: 0.3, fiber: 1, units: { piece: 200 } },
  cauliflower: { name: 'Conopidă', calories: 25, protein: 1.9, carbs: 5, fats: 0.3, fiber: 2, units: {} },
  cabbage: { name: 'Varză albă', calories: 25, protein: 1.3, carbs: 5.8, fats: 0.1, fiber: 2.5, units: {} },
  greenBeans: { name: 'Fasole verde', calories: 31, protein: 1.8, carbs: 7, fats: 0.2, fiber: 2.7, units: {} },
  mushroom: { name: 'Ciuperci', calories: 22, protein: 3.1, carbs: 3.3, fats: 0.3, fiber: 1, units: {} },
  sweetPotato: { name: 'Cartof dulce', calories: 86, protein: 1.6, carbs: 20.1, fats: 0.1, fiber: 3, units: { piece: 180 } },
  beetroot: { name: 'Sfeclă roșie', calories: 43, protein: 1.6, carbs: 9.6, fats: 0.2, fiber: 2.8, units: {} }
};

const recommendationFoods = {
  parmesan: { name: 'Parmezan', calories: 431, protein: 38.5, carbs: 4.1, fats: 28.6, fiber: 0, units: {} },
  parmesanGrated: { name: 'Parmezan ras - Galbani', calories: 402, protein: 32, carbs: 0, fats: 30, fiber: 0, units: {} },
  parmesanMatured: { name: 'Parmezan maturat', calories: 398, protein: 32, carbs: 0, fats: 30, fiber: 0, units: {} },
  eggBoiled: { name: 'Ou fiert', calories: 155, protein: 12.6, carbs: 1.1, fats: 10.6, fiber: 0, units: { piece: 50 } },
  chickenEgg: { name: 'Ou de găină', calories: 143, protein: 12.6, carbs: 0.7, fats: 9.5, fiber: 0, units: { piece: 50 } },
  oliveOil: { name: 'Ulei de măsline', calories: 884, protein: 0, carbs: 0, fats: 100, fiber: 0, units: { tablespoon: 14, teaspoon: 5 } },
  sunflowerOil: { name: 'Ulei de floarea-soarelui', calories: 884, protein: 0, carbs: 0, fats: 100, fiber: 0, units: { tablespoon: 14, teaspoon: 5 } }
};
Object.assign(foodDatabase, recommendationFoods);

try {
  Object.assign(foodDatabase, readStorage('calorie-calculator-custom-foods', {}));
} catch {
  // Catalogul de bază rămâne disponibil dacă datele locale nu pot fi citite.
}

const formatDecimal = (value) => value.toLocaleString('ro-RO', { maximumFractionDigits: 1 });

// Jurnalul este păstrat local, astfel încât fiecare zi să aibă propriile mese.
const mealLabels = { breakfast: 'Mic dejun', lunch: 'Prânz', dinner: 'Cină', snacks: 'Gustări' };
const mealIcons = { breakfast: '☀', lunch: '◒', dinner: '☾', snacks: '✦' };
const defaultGoals = { calories: 2000, protein: 130, carbs: 220, fats: 65, fiber: 30 };
const today = new Date().toISOString().slice(0, 10);
const dateInput = document.querySelector('#selected-date');
const previousDayButton = document.querySelector('#previous-day');
const nextDayButton = document.querySelector('#next-day');
const calendarButton = document.querySelector('#calendar-button');
const storageKeys = { journal: 'calorie-calculator-journal', favorites: 'calorie-calculator-favorites', goals: 'calorie-calculator-goals' };
let currentDate = today;
let editingEntryId = null;

function formatDateDisplay(dateValue) {
  if (!dateValue) return '--/--/----';
  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(getStorageKey(key))) || fallback; } catch { return fallback; }
}

function saveStorage(key, value) { localStorage.setItem(getStorageKey(key), JSON.stringify(value)); }

function getDayJournal() {
  const journal = readStorage(storageKeys.journal, {});
  if (!journal[currentDate]) journal[currentDate] = { breakfast: [], lunch: [], dinner: [], snacks: [] };
  return journal;
}

function nutrientTotals(entries) {
  return entries.reduce((total, entry) => {
    Object.keys(total).forEach((key) => { total[key] += entry[key]; });
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
}

function scaledNutrients(foodKey, amount, unit = 'gram') {
  const base = foodDatabase[foodKey];
  if (!base) return { grams: 0, calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
  const grams = unit === 'gram' ? amount : amount * (base.units?.[unit] || 0);
  const ratio = grams / 100;
  return { grams, ...Object.fromEntries(['calories', 'protein', 'carbs', 'fats', 'fiber'].map((key) => [key, base[key] * ratio])) };
}

function displayValue(value, suffix = '') { return `${formatDecimal(value)}${suffix}`; }
function displayQuantity(entry) {
  const labels = { gram: 'g', piece: entry.amount === 1 ? 'bucată' : 'bucăți', tablespoon: entry.amount === 1 ? 'lingură' : 'linguri', teaspoon: entry.amount === 1 ? 'linguriță' : 'lingurițe', glass: entry.amount === 1 ? 'pahar' : 'pahare' };
  return `${formatDecimal(entry.amount)} ${labels[entry.unit || 'gram']}`;
}

function renderMeals() {
  const journal = getDayJournal();
  const mealsList = document.querySelector('#meals-list');
  mealsList.innerHTML = Object.entries(mealLabels).map(([key, label]) => {
    const entries = journal[currentDate][key] || [];
    const totals = nutrientTotals(entries);
    const entryMarkup = entries.length ? entries.map((entry) => `
      <div class="food-entry">
        <button class="favorite-toggle ${!entry.isRecipe && isFavorite(entry.food) ? 'is-favorite' : ''}" data-favorite="${entry.food || ''}" aria-label="Favoritează alimentul">${!entry.isRecipe && isFavorite(entry.food) ? '♥' : '♡'}</button>
        <span class="food-entry-name" ${entry.isRecipe ? `data-edit="${entry.id}" data-meal="${key}"` : ''}>${recipeEntryName(entry)}<small>${entry.isRecipe ? `${displayValue(entry.amount)} porții` : displayQuantity(entry)} · ${displayValue(entry.protein, 'g')} proteine</small></span>
        <span class="food-entry-kcal">${formatNumber(entry.calories)} kcal</span>
        <span class="entry-actions"><button class="icon-button" type="button" data-edit="${entry.id}" data-meal="${key}" aria-label="Editează alimentul">✎</button><button class="icon-button" type="button" data-delete="${entry.id}" data-meal="${key}" aria-label="Șterge alimentul">×</button></span>
      </div>`).join('') : '<div class="meal-empty">Niciun aliment adăugat încă.</div>';
    return `<article class="meal-card"><div class="meal-card-head"><div class="meal-card-title"><span class="meal-emoji">${mealIcons[key]}</span><h3>${label}</h3></div><span class="meal-total"><b>${formatNumber(totals.calories)} kcal</b><small>P ${displayValue(totals.protein, 'g')} · C ${displayValue(totals.carbs, 'g')} · G ${displayValue(totals.fats, 'g')} · F ${displayValue(totals.fiber, 'g')}</small></span><button class="meal-add-button" type="button" data-meal-add="${key}">+ Adaugă masă</button></div><div class="meal-items">${entryMarkup}</div></article>`;
  }).join('');
  updateDashboardTotals(journal[currentDate]);
}

function updateDashboardTotals(day) {
  const totals = nutrientTotals(Object.keys(mealLabels).flatMap((mealKey) => day[mealKey] || []));
  const goals = readStorage(storageKeys.goals, defaultGoals);
  const mappings = [['calories', 'dashboard-calories', 'dashboard-calorie-goal', 'calories-progress', ''], ['protein', 'dashboard-protein', 'dashboard-protein-goal', 'protein-progress', ' g'], ['carbs', 'dashboard-carbs', 'dashboard-carbs-goal', 'carbs-progress', ' g'], ['fats', 'dashboard-fats', 'dashboard-fats-goal', 'fats-progress', ' g'], ['fiber', 'dashboard-fiber', 'dashboard-fiber-goal', 'fiber-progress', ' g']];
  mappings.forEach(([key, valueId, goalId, progressId, suffix]) => {
    document.querySelector(`#${valueId}`).textContent = displayValue(totals[key], suffix);
    document.querySelector(`#${goalId}`).textContent = displayValue(goals[key], suffix);
    document.querySelector(`#${progressId}`).style.width = `${Math.min(100, (totals[key] / goals[key]) * 100)}%`;
  });
}

let reportWeekEnd = today;

function shiftDate(dateValue, days) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function reportDays() {
  const end = reportWeekEnd;
  return Array.from({ length: 7 }, (_, index) => shiftDate(end, index - 6));
}

function formatReportDate(dateValue, options = { day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('ro-RO', options).format(new Date(`${dateValue}T12:00:00`));
}

function formatReportPeriod() {
  const days = reportDays();
  return `${formatReportDate(days[0])} – ${formatReportDate(days[6])}`;
}

function localWeeklyReportData(days) {
  const journal = readStorage(storageKeys.journal, {});
  const daily = days.map((dateValue) => {
    const day = journal[dateValue] || {};
    const entries = Object.keys(mealLabels).flatMap((mealKey) => day[mealKey] || []);
    return { date: dateValue, entries, totals: nutrientTotals(entries) };
  });
  return { daily, goals: readStorage(storageKeys.goals, defaultGoals) };
}

async function weeklyReportData(days) {
  const session = window.__activeSupabaseSession;
  const client = window.__supabaseClient;
  if (!client || !session?.user) return localWeeklyReportData(days);
  const [{ data: meals }, { data: goals }] = await Promise.all([
    client.from('meals').select('*').eq('user_id', session.user.id).gte('consumed_on', days[0]).lte('consumed_on', days[6]),
    client.from('goals').select('*').eq('user_id', session.user.id).maybeSingle()
  ]);
  const daily = days.map((dateValue) => {
    const entries = (meals || []).filter((meal) => meal.consumed_on === dateValue).map((meal) => ({ ...meal, mealType: meal.meal_type, isRecipe: Boolean(meal.recipe_id), recipeId: meal.recipe_id }));
    return { date: dateValue, entries, totals: nutrientTotals(entries) };
  });
  return { daily, goals: goals || defaultGoals };
}

function reportPercent(value, goal) { return goal > 0 ? Math.round((value / goal) * 100) : 0; }

function renderWeeklyReport(data) {
  const target = document.querySelector('#weekly-report-content');
  const label = document.querySelector('#report-period-label');
  if (!target || !label) return;
  label.textContent = formatReportPeriod();
  const { daily, goals } = data;
  const availableDays = daily.filter((day) => day.entries.length > 0);
  const total = nutrientTotals(daily.flatMap((day) => day.entries));
  const average = availableDays.length ? Object.fromEntries(Object.entries(total).map(([key, value]) => [key, value / availableDays.length])) : total;
  const calorieDays = daily.filter((day) => day.entries.length > 0);
  const belowGoal = calorieDays.filter((day) => day.totals.calories < goals.calories).length;
  const aboveGoal = calorieDays.filter((day) => day.totals.calories > goals.calories).length;
  const maxCalories = Math.max(goals.calories, ...daily.map((day) => day.totals.calories), 1);
  const mealTotals = Object.fromEntries(Object.keys(mealLabels).map((key) => [key, 0]));
  daily.forEach((day) => day.entries.forEach((entry) => { mealTotals[entry.mealType || entry.meal_type] = (mealTotals[entry.mealType || entry.meal_type] || 0) + entry.calories; }));
  const recipeCount = new Set(daily.flatMap((day) => day.entries.filter((entry) => entry.isRecipe || entry.recipe_id).map((entry) => entry.recipeId || entry.recipe_id))).size;
  const mostCalories = calorieDays.reduce((best, day) => !best || day.totals.calories > best.totals.calories ? day : best, null);
  const leastCalories = calorieDays.reduce((best, day) => !best || day.totals.calories < best.totals.calories ? day : best, null);
  const mostProtein = calorieDays.reduce((best, day) => !best || day.totals.protein > best.totals.protein ? day : best, null);
  const dayLabel = (day) => day ? formatReportDate(day.date, { weekday: 'long' }) : '—';
  const percentage = reportPercent(average.calories, goals.calories);
  const availabilityNote = availableDays.length < 7 ? 'Nu există suficiente date pentru fiecare zi din această perioadă; sunt afișate doar zilele cu mese înregistrate.' : '';
  target.innerHTML = `
    ${availabilityNote ? `<div class="report-empty">${availabilityNote}</div>` : ''}
    <div class="report-grid">
      <article class="report-card"><h2>Rezumat calorii</h2><div class="report-stat-list"><div class="report-stat-row"><span>Media / zi</span><strong>${formatNumber(average.calories)} kcal</strong></div><div class="report-stat-row"><span>Total săptămână</span><strong>${formatNumber(total.calories)} kcal</strong></div><div class="report-stat-row"><span>Obiectiv zilnic</span><strong>${formatNumber(goals.calories)} kcal</strong></div><div class="report-stat-row"><span>Sub obiectiv</span><strong>${belowGoal} zile</strong></div><div class="report-stat-row"><span>Peste obiectiv</span><strong>${aboveGoal} zile</strong></div></div></article>
      <article class="report-card report-card-wide"><h2>Macronutrienți, medie zilnică</h2><div class="macro-report-grid">${[['protein', 'Proteine', 'g'], ['carbs', 'Carbohidrați', 'g'], ['fats', 'Grăsimi', 'g'], ['fiber', 'Fibre', 'g']].map(([key, name, unit]) => `<div class="macro-report-item"><h3>${name}</h3><strong>${formatDecimal(average[key])} ${unit}</strong><small>${reportPercent(average[key], goals[key])}% din ${formatDecimal(goals[key])} g</small><div class="report-progress"><span style="width:${Math.min(100, reportPercent(average[key], goals[key]))}%"></span></div></div>`).join('')}</div></article>
      <article class="report-card report-card-wide"><h2>Evoluția pe zile</h2><div class="report-chart">${daily.map((day) => `<div class="report-chart-row"><span class="report-chart-label">${formatReportDate(day.date, { weekday: 'short' })}</span><div class="report-bars"><span class="report-bar report-bar-calories" style="width:${Math.max(2, (day.totals.calories / maxCalories) * 100)}%"></span><span class="report-bar report-bar-goal" style="width:${Math.max(2, (goals.calories / maxCalories) * 100)}%"></span></div><span class="report-chart-values">${formatNumber(day.totals.calories)} / ${formatNumber(goals.calories)}</span></div>`).join('')}</div><div class="report-legend"><span>Calorii consumate</span><span>Obiectiv</span></div></article>
      <article class="report-card"><h2>Distribuția meselor</h2><div class="meal-distribution">${Object.entries(mealLabels).map(([key, name]) => `<div class="meal-distribution-item"><h3>${name}</h3><strong>${total.calories ? Math.round((mealTotals[key] / total.calories) * 100) : 0}%</strong><small>${formatNumber(mealTotals[key])} kcal</small></div>`).join('')}</div></article>
      <article class="report-card"><h2>Statistici</h2><div class="report-stat-list"><div class="report-stat-row"><span>Mai multe calorii</span><strong>${dayLabel(mostCalories)}</strong></div><div class="report-stat-row"><span>Mai puține calorii</span><strong>${dayLabel(leastCalories)}</strong></div><div class="report-stat-row"><span>Mai multe proteine</span><strong>${dayLabel(mostProtein)}</strong></div><div class="report-stat-row"><span>Total mese</span><strong>${daily.reduce((count, day) => count + day.entries.length, 0)}</strong></div><div class="report-stat-row"><span>Rețete folosite</span><strong>${recipeCount}</strong></div></div></article>
    </div>
    <p class="report-note">${availableDays.length ? `În această perioadă ai avut o medie de ${formatNumber(average.calories)} kcal/zi, reprezentând ${percentage}% din obiectivul tău zilnic.` : 'Nu există suficiente date pentru a calcula o observație pentru această perioadă.'}</p>`;
}

async function refreshWeeklyReport() {
  const target = document.querySelector('#weekly-report-content');
  if (target) target.innerHTML = '<div class="report-empty">Se încarcă raportul...</div>';
  renderWeeklyReport(await weeklyReportData(reportDays()));
}

document.querySelector('#previous-report-week')?.addEventListener('click', () => { reportWeekEnd = shiftDate(reportWeekEnd, -7); refreshWeeklyReport(); });
document.querySelector('#next-report-week')?.addEventListener('click', () => { reportWeekEnd = shiftDate(reportWeekEnd, 7); refreshWeeklyReport(); });
document.querySelector('#current-report-week')?.addEventListener('click', () => { reportWeekEnd = today; refreshWeeklyReport(); });
document.querySelector('#report-back-button')?.addEventListener('click', () => { window.location.hash = 'dashboard-page'; });

function isFavorite(foodKey) { return readStorage(storageKeys.favorites, []).includes(foodKey); }

function renderFavorites() {
  const favorites = readStorage(storageKeys.favorites, []);
  const target = document.querySelector('#favorites-list');
  if (!target) return;
  target.innerHTML = favorites.length ? favorites.map((key) => `<div class="favorite-row"><span>${foodDatabase[key].name}</span><button type="button" data-favorite-add="${key}">+ Adaugă</button></div>`).join('') : '<span class="favorite-empty">Apasă ♡ lângă un aliment pentru a-l salva.</span>';
}

function toggleFavorite(foodKey) {
  const favorites = readStorage(storageKeys.favorites, []);
  const next = favorites.includes(foodKey) ? favorites.filter((key) => key !== foodKey) : [...favorites, foodKey];
  saveStorage(storageKeys.favorites, next);
  renderFavorites();
  renderMeals();
}

function openMealModal(mealType = 'breakfast', entry = null) {
  document.querySelector('#food-modal').hidden = false;
  document.querySelector('#meal-type').value = mealType;
  document.querySelector('#meal-food').value = entry ? entry.food : Object.keys(foodDatabase)[0];
  document.querySelector('#meal-amount').value = entry ? entry.amount : 100;
  document.querySelector('#meal-unit').value = entry?.unit || 'gram';
  updateUnitOptions();
  document.querySelector('#meal-submit-label').textContent = entry ? 'Salvează modificarea' : 'Adaugă în jurnal';
  editingEntryId = entry ? entry.id : null;
}

function closeMealModal() { document.querySelector('#food-modal').hidden = true; editingEntryId = null; document.querySelector('#meal-error').textContent = ''; }

function prepareMealForm() {
  document.querySelector('#meal-food').innerHTML = Object.entries(foodDatabase).map(([key, food]) => `<option value="${key}">${food.name}</option>`).join('');
  document.querySelector('#meal-food').addEventListener('change', updateUnitOptions);
  document.querySelector('#meal-unit').addEventListener('change', updateUnitHint);
  updateUnitOptions();
  renderFoodSuggestions();
}

function updateUnitOptions() {
  const food = foodDatabase[document.querySelector('#meal-food').value];
  const unitSelect = document.querySelector('#meal-unit');
  const current = unitSelect.value;
  const unitLabels = { gram: 'grame (g)', piece: food?.pieceLabel || 'bucată', tablespoon: 'lingură', teaspoon: 'linguriță', glass: 'pahar' };
  const available = ['gram', ...Object.keys(food?.units || {})];
  unitSelect.innerHTML = available.map((unit) => `<option value="${unit}">${unitLabels[unit]}</option>`).join('');
  unitSelect.value = available.includes(current) ? current : 'gram';
  updateUnitHint();
}

function updateUnitHint() {
  const food = foodDatabase[document.querySelector('#meal-food').value];
  const unit = document.querySelector('#meal-unit').value;
  const grams = unit === 'gram' ? null : food?.units?.[unit];
  document.querySelector('#unit-hint').textContent = grams ? `1 ${unit === 'piece' ? 'bucată' : unit === 'tablespoon' ? 'lingură' : 'linguriță'} ≈ ${grams} g` : 'Alege grame dacă nu există o conversie pentru acest aliment.';
}

document.querySelector('#meal-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const food = document.querySelector('#meal-food').value;
  const meal = document.querySelector('#meal-type').value;
  const amount = Number(document.querySelector('#meal-amount').value);
  const unit = document.querySelector('#meal-unit').value;
  const converted = scaledNutrients(food, amount, unit);
  if (!food || !amount || amount < 0.1 || (unit === 'gram' && amount > 5000) || !converted.grams) { document.querySelector('#meal-error').textContent = 'Alege o unitate disponibilă și introdu o cantitate validă.'; return; }
  const journal = getDayJournal();
  if (editingEntryId) {
    Object.values(journal[currentDate]).forEach((entries) => {
      const index = entries.findIndex((entry) => entry.id === editingEntryId);
      if (index >= 0) entries.splice(index, 1);
    });
  }
  journal[currentDate][meal].push({ id: editingEntryId || `${Date.now()}-${Math.random()}`, food, amount, unit, ...converted });
  saveStorage(storageKeys.journal, journal);
  closeMealModal(); renderMeals();
});

document.querySelector('#meals-list').addEventListener('click', (event) => {
  const favorite = event.target.closest('[data-favorite]');
  const edit = event.target.closest('[data-edit]');
  const remove = event.target.closest('[data-delete]');
  const add = event.target.closest('[data-meal-add]');
  if (favorite?.dataset.favorite) toggleFavorite(favorite.dataset.favorite);
  if (add) openRecipeModal(null, add.dataset.mealAdd);
  if (edit) {
    const journal = getDayJournal();
    const entry = journal[currentDate][edit.dataset.meal].find((item) => item.id === edit.dataset.edit);
    if (entry?.isRecipe) {
      const recipe = readStorage('calorie-calculator-recipes', []).find((item) => item.id === entry.recipeId);
      if (recipe) openRecipeModal(recipe, edit.dataset.meal, entry);
    } else if (entry) openMealModal(edit.dataset.meal, entry);
  }
  if (remove) {
    const journal = getDayJournal();
    journal[currentDate][remove.dataset.meal] = journal[currentDate][remove.dataset.meal].filter((entry) => entry.id !== remove.dataset.delete);
    saveStorage(storageKeys.journal, journal); renderMeals();
  }
});

document.querySelectorAll('[data-open-food]').forEach((button) => button.addEventListener('click', () => openMealModal()));
document.querySelectorAll('[data-close-food]').forEach((button) => button.addEventListener('click', closeMealModal));
const favoritesList = document.querySelector('#favorites-list');
if (favoritesList) favoritesList.addEventListener('click', (event) => { const add = event.target.closest('[data-favorite-add]'); if (add) openMealModal(); if (add) document.querySelector('#meal-food').value = add.dataset.favoriteAdd; });
dateInput.value = today;
dateInput.max = today;
document.querySelector('#selected-date-label').textContent = formatDateDisplay(today);
function selectJournalDate(dateValue) {
  currentDate = dateValue > today ? today : dateValue;
  dateInput.value = currentDate;
  document.querySelector('#selected-date-label').textContent = formatDateDisplay(currentDate);
  nextDayButton.disabled = currentDate === today;
  renderMeals();
}

function shiftJournalDate(days) {
  const date = new Date(`${currentDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  selectJournalDate(date.toISOString().slice(0, 10));
}

dateInput.addEventListener('change', () => selectJournalDate(dateInput.value || today));
previousDayButton.addEventListener('click', () => shiftJournalDate(-1));
nextDayButton.addEventListener('click', () => shiftJournalDate(1));
calendarButton.addEventListener('click', () => {
  if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
  else dateInput.click();
});
selectJournalDate(today);
document.querySelector('#goals-form').addEventListener('submit', (event) => { event.preventDefault(); const goals = { calories: Number(document.querySelector('#goal-calories').value), protein: Number(document.querySelector('#goal-protein').value), carbs: Number(document.querySelector('#goal-carbs').value), fats: Number(document.querySelector('#goal-fats').value), fiber: Number(document.querySelector('#goal-fiber').value) }; saveStorage(storageKeys.goals, goals); updateDashboardTotals(getDayJournal()[currentDate]); });

const savedGoals = readStorage(storageKeys.goals, defaultGoals);
Object.entries(savedGoals).forEach(([key, value]) => { document.querySelector(`#goal-${key}`).value = value; });
prepareMealForm(); renderFavorites(); renderMeals(); restoreCalculatorProfile();

const recipeStorageKey = 'calorie-calculator-recipes';
let editingRecipeId = null;
let recipeMealContext = null;
let editingMealEntryContext = null;
let ingredientCounter = 0;

function recipeTotals(ingredients) { return nutrientTotals(ingredients.map((ingredient) => ingredient.nutrients)); }

function recipeEntryName(entry) { return entry.isRecipe ? entry.recipeName : foodDatabase[entry.food]?.name || entry.food; }

function renderRecipes() {
  const recipes = readStorage(recipeStorageKey, []);
  const query = document.querySelector('#recipe-search').value.trim().toLocaleLowerCase('ro');
  const filtered = recipes.filter((recipe) => recipe.name.toLocaleLowerCase('ro').includes(query));
  document.querySelector('#recipe-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'rețetă' : 'rețete'}`;
  document.querySelector('#recipes-list').innerHTML = filtered.length ? filtered.map((recipe) => {
    const total = recipeTotals(recipe.ingredients);
    const perServing = Object.fromEntries(Object.entries(total).map(([key, value]) => [key, value / recipe.servings]));
    return `<article class="recipe-card"><div class="recipe-card-main"><div class="recipe-card-title"><button class="recipe-heart ${recipe.favorite ? 'is-favorite' : ''}" data-recipe-favorite="${recipe.id}" aria-label="Favoritează rețeta">${recipe.favorite ? '♥' : '♡'}</button><div><h3>${recipe.name}</h3><small>${recipe.ingredients.length} ingrediente · ${recipe.servings} ${recipe.servings === 1 ? 'porție' : 'porții'}</small></div></div><div class="recipe-nutrition"><strong>${formatNumber(total.calories)} <small>kcal total</small></strong><span>${formatDecimal(perServing.calories)} kcal / porție</span><small>P ${formatDecimal(perServing.protein)} g · C ${formatDecimal(perServing.carbs)} g · G ${formatDecimal(perServing.fats)} g · F ${formatDecimal(perServing.fiber)} g</small></div></div><div class="recipe-card-actions"><select data-recipe-meal="${recipe.id}" aria-label="Masa pentru rețetă"><option value="breakfast">Mic dejun</option><option value="lunch">Prânz</option><option value="dinner">Cină</option><option value="snacks">Gustări</option></select><input data-recipe-portions="${recipe.id}" type="number" min="0.5" step="0.5" value="1" aria-label="Număr de porții"><button class="text-button" data-recipe-add="${recipe.id}">Adaugă la masă</button><button class="icon-button" data-recipe-edit="${recipe.id}" aria-label="Editează rețeta">✎</button><button class="icon-button" data-recipe-delete="${recipe.id}" aria-label="Șterge rețeta">×</button></div></article>`;
  }).join('') : '<div class="recipes-empty">Nu ai rețete salvate încă. Creează prima ta rețetă.</div>';
}

function ingredientUnitOptions(foodKey, selected = 'gram') {
  const food = foodDatabase[foodKey];
  const labels = { gram: 'g', piece: 'bucată / cantitate', tablespoon: 'lingură', teaspoon: 'linguriță', glass: 'pahar' };
  const availableUnits = foodKey ? Object.keys(food?.units || {}) : ['piece'];
  return ['gram', ...availableUnits].map((unit) => `<option value="${unit}" ${unit === selected ? 'selected' : ''}>${labels[unit]}</option>`).join('');
}

function findFoodKey(name) {
  const normalized = name.trim().toLocaleLowerCase('ro');
  return Object.entries(foodDatabase).find(([, food]) => food.name.toLocaleLowerCase('ro') === normalized)?.[0] || '';
}

function matchingFoods(query) {
  const normalized = query.trim().toLocaleLowerCase('ro');
  if (!normalized) return [];
  return Object.entries(foodDatabase).filter(([, food]) => food.name.toLocaleLowerCase('ro').includes(normalized)).slice(0, 6);
}

function renderFoodSuggestions() {
  let list = document.querySelector('#food-suggestions');
  if (!list) { list = document.createElement('datalist'); list.id = 'food-suggestions'; document.querySelector('#recipe-form').appendChild(list); }
  list.innerHTML = Object.values(foodDatabase).map((food) => `<option value="${food.name}"></option>`).join('');
}

function addIngredientRow(ingredient = null) {
  const key = ingredient?.food || '';
  const rowId = `ingredient-${ingredientCounter++}`;
  const row = document.createElement('div');
  row.className = 'ingredient-row'; row.dataset.rowId = rowId;
  row.innerHTML = `<div class="ingredient-food-wrap"><input class="ingredient-food" type="text" value="${key ? foodDatabase[key].name : ''}" placeholder="Scrie alimentul..." aria-label="Ingredient"><div class="food-recommendations" role="listbox"></div></div><input class="ingredient-amount" type="number" min="1" step="1" value="${ingredient?.amount || 100}" aria-label="Cantitate"><select class="ingredient-unit" aria-label="Unitate">${ingredientUnitOptions(key, ingredient?.unit || 'gram')}</select><button type="button" class="icon-button remove-ingredient" aria-label="Șterge ingredientul">×</button><div class="ingredient-nutrition-preview"></div>`;
  document.querySelector('#ingredient-list').appendChild(row);
  const amountInput = row.querySelector('.ingredient-amount');
  amountInput.min = '1';
  amountInput.step = '1';
  amountInput.inputMode = 'numeric';
  amountInput.addEventListener('keydown', (event) => {
    if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  });
  amountInput.value = String(Math.max(1, Math.round(Number(amountInput.value) || 1)));
  row.querySelector('.ingredient-food').dataset.foodKey = key;
  const foodInput = row.querySelector('.ingredient-food');
  foodInput.addEventListener('input', () => {
    const foodKey = findFoodKey(foodInput.value);
    foodInput.dataset.foodKey = foodKey;
    row.querySelector('.ingredient-unit').innerHTML = ingredientUnitOptions(foodKey);
    renderIngredientRecommendations(row, foodInput.value);
    renderIngredientNutrition(row);
    updateRecipePreview();
  });
  row.querySelector('.ingredient-amount').addEventListener('input', (event) => { const amount = Number(event.target.value); if (Number.isFinite(amount) && amount > 0) event.target.value = Math.round(amount); renderIngredientNutrition(row); updateRecipePreview(); });
  row.querySelector('.ingredient-unit').addEventListener('change', () => { renderIngredientNutrition(row); updateRecipePreview(); });
  row.querySelector('.remove-ingredient').addEventListener('click', () => { row.remove(); updateRecipePreview(); });
  renderIngredientNutrition(row);
  updateRecipePreview();
}

function renderIngredientNutrition(row) {
  const foodKey = row.querySelector('.ingredient-food').dataset.foodKey;
  const amount = Number(row.querySelector('.ingredient-amount').value);
  const unit = row.querySelector('.ingredient-unit').value;
  const preview = row.querySelector('.ingredient-nutrition-preview');
  if (!foodKey || !foodDatabase[foodKey] || !amount) {
    preview.textContent = 'Valorile apar după alegerea unei recomandări sau salvarea alimentului.';
    preview.classList.add('is-empty');
    return;
  }
  const nutrients = scaledNutrients(foodKey, amount, unit);
  preview.classList.remove('is-empty');
  preview.innerHTML = `<span>🔥 ${formatNumber(nutrients.calories)} kcal</span><span>💪 Proteine: ${formatDecimal(nutrients.protein)} g</span><span>🍞 Carbohidrați: ${formatDecimal(nutrients.carbs)} g</span><span>🥑 Grăsimi: ${formatDecimal(nutrients.fats)} g</span><span>🌾 Fibre: ${formatDecimal(nutrients.fiber)} g</span>`;
}

function renderIngredientRecommendations(row, query) {
  const box = row.querySelector('.food-recommendations');
  const matches = matchingFoods(query);
  box.innerHTML = matches.map(([key, food]) => `<button type="button" class="food-recommendation" data-food-key="${key}"><span>${food.name}</span><small>${formatNumber(food.calories)} kcal · P ${formatDecimal(food.protein)} g · C ${formatDecimal(food.carbs)} g · G ${formatDecimal(food.fats)} g</small></button>`).join('');
  box.hidden = matches.length === 0;
  box.querySelectorAll('.food-recommendation').forEach((button) => button.addEventListener('click', () => {
    const foodKey = button.dataset.foodKey;
    foodInputFor(row).value = foodDatabase[foodKey].name;
    foodInputFor(row).dataset.foodKey = foodKey;
    row.querySelector('.ingredient-unit').innerHTML = ingredientUnitOptions(foodKey);
    box.hidden = true;
    renderIngredientNutrition(row);
    updateRecipePreview();
  }));
}

function foodInputFor(row) { return row.querySelector('.ingredient-food'); }

function collectIngredients() {
  return [...document.querySelectorAll('.ingredient-row')].map((row) => {
    const food = row.querySelector('.ingredient-food').dataset.foodKey || '';
    const amount = Number(row.querySelector('.ingredient-amount').value);
    const unit = row.querySelector('.ingredient-unit').value;
    return { food, amount, unit, nutrients: scaledNutrients(food, amount, unit) };
  }).filter((ingredient) => ingredient.food && ingredient.amount > 0 && ingredient.nutrients.grams > 0);
}

function updateRecipePreview() {
  const ingredients = collectIngredients();
  const total = recipeTotals(ingredients);
  const servings = Number(document.querySelector('#recipe-servings').value) || 1;
  document.querySelector('#recipe-serving-total').textContent = `${ingredients.length} ${ingredients.length === 1 ? 'ingredient' : 'ingrediente'}`;
  document.querySelector('#recipe-total-calories').textContent = `${formatNumber(total.calories)} kcal`;
  document.querySelector('#recipe-total-macros').textContent = `P ${formatDecimal(total.protein)} g · C ${formatDecimal(total.carbs)} g · G ${formatDecimal(total.fats)} g · F ${formatDecimal(total.fiber)} g`;
  document.querySelector('#recipe-per-serving').textContent = `${formatNumber(total.calories / servings)} kcal`;
  document.querySelector('#recipe-per-serving-macros').textContent = `P ${formatDecimal(total.protein / servings)} g · C ${formatDecimal(total.carbs / servings)} g · G ${formatDecimal(total.fats / servings)} g · F ${formatDecimal(total.fiber / servings)} g`;
}

function openRecipeModal(recipe = null, mealType = null, mealEntry = null) {
  editingRecipeId = recipe?.id || null;
  recipeMealContext = mealType;
  editingMealEntryContext = mealEntry;
  document.querySelector('#recipe-modal').hidden = false;
  document.querySelector('#recipe-modal-title').textContent = recipe ? 'Editează masa' : mealType ? `Adaugă masă · ${mealLabels[mealType]}` : 'Rețetă nouă';
  document.querySelector('#recipe-name').value = recipe?.name || '';
  document.querySelector('#recipe-servings').value = recipe?.servings || 1;
  document.querySelector('#custom-food-panel').hidden = true;
  document.querySelector('#recipe-error').textContent = '';
  document.querySelector('#ingredient-list').innerHTML = '';
  (recipe?.ingredients || [null]).forEach(addIngredientRow);
  updateRecipePreview();
}

function closeRecipeModal() { document.querySelector('#recipe-modal').hidden = true; editingRecipeId = null; recipeMealContext = null; editingMealEntryContext = null; document.querySelector('#recipe-error').textContent = ''; }

function saveCustomFoods() {
  const customFoods = Object.fromEntries(Object.entries(foodDatabase).filter(([, food]) => food.custom));
  saveStorage('calorie-calculator-custom-foods', customFoods);
}

function renderFoodLibrary() {
  const target = document.querySelector('#foods-library-list');
  if (!target) return;
  const query = document.querySelector('#foods-library-search').value.trim().toLocaleLowerCase('ro');
  const foods = Object.entries(foodDatabase).filter(([, food]) => food.name.toLocaleLowerCase('ro').includes(query));
  target.innerHTML = foods.length ? foods.map(([key, food]) => `
    <article class="food-library-card" data-library-food="${key}">
      <h3>${food.name}</h3>
      <small>Valori nutriționale pentru 100 g</small>
      <form class="food-library-form">
        <label>Calorii<input name="calories" type="number" min="0" step="0.1" value="${food.calories}"></label>
        <label>Proteine<input name="protein" type="number" min="0" step="0.1" value="${food.protein}"></label>
        <label>Carbohidrați<input name="carbs" type="number" min="0" step="0.1" value="${food.carbs}"></label>
        <label>Grăsimi<input name="fats" type="number" min="0" step="0.1" value="${food.fats}"></label>
        <label>Fibre<input name="fiber" type="number" min="0" step="0.1" value="${food.fiber}"></label>
        <div class="food-library-actions"><button class="secondary-button" type="submit">Salvează valorile</button></div>
      </form>
    </article>`).join('') : '<div class="food-library-empty">Nu am găsit niciun aliment.</div>';
}

document.querySelector('#foods-library-search').addEventListener('input', renderFoodLibrary);
document.querySelector('#foods-library-list').addEventListener('submit', (event) => {
  event.preventDefault();
  const card = event.target.closest('[data-library-food]');
  const food = foodDatabase[card.dataset.libraryFood];
  const values = Object.fromEntries(['calories', 'protein', 'carbs', 'fats', 'fiber'].map((key) => [key, Number(new FormData(event.target).get(key))]));
  if (!food || Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) return;
  Object.assign(food, values, { custom: true });
  saveCustomFoods();
  prepareMealForm();
  renderFoodLibrary();
  const visibleCard = [...document.querySelectorAll('[data-library-food]')].find((item) => item.dataset.libraryFood === card.dataset.libraryFood);
  const saveButton = visibleCard?.querySelector('button[type="submit"]');
  if (!saveButton) return;
  saveButton.textContent = 'Salvat!';
  saveButton.classList.add('is-saved');
  window.setTimeout(() => {
    saveButton.textContent = 'Salvează valorile';
    saveButton.classList.remove('is-saved');
  }, 1400);
});

document.querySelector('#add-custom-food').addEventListener('click', () => {
  const panel = document.querySelector('#custom-food-panel');
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    const unresolved = [...document.querySelectorAll('.ingredient-food')].find((input) => input.value.trim() && !input.dataset.foodKey);
    if (unresolved) document.querySelector('#custom-food-name').value = unresolved.value.trim();
  }
});

document.querySelector('#save-custom-food').addEventListener('click', () => {
  const name = document.querySelector('#custom-food-name').value.trim();
  const values = ['calories', 'protein', 'carbs', 'fats', 'fiber'].map((key) => Number(document.querySelector(`#custom-food-${key}`).value));
  const unitWeight = Number(document.querySelector('#custom-food-unit').value);
  const error = document.querySelector('#custom-food-error');
  if (!name || values.some((value) => !Number.isFinite(value) || value < 0)) { error.textContent = 'Introdu numele și toate valorile nutriționale.'; return; }
  const key = `custom-${Date.now()}`;
  foodDatabase[key] = { name, calories: values[0], protein: values[1], carbs: values[2], fats: values[3], fiber: values[4], units: unitWeight > 0 ? { piece: unitWeight } : {}, custom: true };
  saveCustomFoods();
  prepareMealForm();
  const existingRow = [...document.querySelectorAll('.ingredient-row')].find((row) => row.querySelector('.ingredient-food').value.trim().toLocaleLowerCase('ro') === name.toLocaleLowerCase('ro') && !row.querySelector('.ingredient-food').dataset.foodKey);
  if (existingRow) {
    const foodInput = existingRow.querySelector('.ingredient-food');
    foodInput.dataset.foodKey = key;
    existingRow.querySelector('.ingredient-unit').innerHTML = ingredientUnitOptions(key);
  } else addIngredientRow({ food: key, amount: 100, unit: 'gram' });
  renderFoodSuggestions();
  updateRecipePreview();
  ['name', 'calories', 'protein', 'carbs', 'fats', 'fiber', 'unit'].forEach((field) => { document.querySelector(`#custom-food-${field}`).value = ''; });
  error.textContent = '';
  document.querySelector('#custom-food-panel').hidden = true;
});

document.querySelector('[data-open-recipe]').addEventListener('click', () => openRecipeModal());
document.querySelectorAll('[data-close-recipe]').forEach((button) => button.addEventListener('click', closeRecipeModal));
document.querySelector('#add-ingredient').addEventListener('click', () => addIngredientRow());
document.querySelector('#recipe-servings').addEventListener('input', updateRecipePreview);
document.querySelector('#recipe-search').addEventListener('input', renderRecipes);
document.querySelector('#recipe-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#recipe-name').value.trim();
  const ingredients = collectIngredients();
  const servings = Number(document.querySelector('#recipe-servings').value);
  const unresolved = [...document.querySelectorAll('.ingredient-row')].some((row) => row.querySelector('.ingredient-food').value.trim() && !row.querySelector('.ingredient-food').dataset.foodKey);
  if (!name || !ingredients.length || unresolved || !servings || servings < 1) { document.querySelector('#recipe-error').textContent = unresolved ? 'Alimentele noi trebuie salvate cu valorile lor nutriționale înainte de a continua.' : 'Completează denumirea, adaugă cel puțin un ingredient și setează porțiile.'; return; }
  const recipes = readStorage(recipeStorageKey, []);
  const previous = recipes.find((recipe) => recipe.id === editingRecipeId);
  const recipe = { id: editingRecipeId || `${Date.now()}-${Math.random()}`, name, ingredients, servings, favorite: previous?.favorite || false };
  saveStorage(recipeStorageKey, editingRecipeId ? recipes.map((item) => item.id === editingRecipeId ? recipe : item) : [...recipes, recipe]);
  if (recipeMealContext) {
    const total = recipeTotals(ingredients);
    const journal = getDayJournal();
    Object.keys(mealLabels).forEach((mealKey) => {
      const entries = journal[currentDate][mealKey] || [];
      journal[currentDate][mealKey] = entries.filter((entry) => entry.id !== editingMealEntryContext?.id);
    });
    const portions = editingMealEntryContext?.amount || 1;
    journal[currentDate][recipeMealContext].push({ id: editingMealEntryContext?.id || `${Date.now()}-${Math.random()}`, recipeId: recipe.id, isRecipe: true, recipeName: name, amount: portions, unit: 'portion', calories: total.calories * portions / servings, protein: total.protein * portions / servings, carbs: total.carbs * portions / servings, fats: total.fats * portions / servings, fiber: total.fiber * portions / servings });
    saveStorage(storageKeys.journal, journal);
  }
  closeRecipeModal(); renderRecipes(); renderMeals();
});
document.querySelector('#recipes-list').addEventListener('click', (event) => {
  const favorite = event.target.closest('[data-recipe-favorite]');
  const edit = event.target.closest('[data-recipe-edit]');
  const remove = event.target.closest('[data-recipe-delete]');
  const add = event.target.closest('[data-recipe-add]');
  const recipes = readStorage(recipeStorageKey, []);
  if (favorite) { saveStorage(recipeStorageKey, recipes.map((recipe) => recipe.id === favorite.dataset.recipeFavorite ? { ...recipe, favorite: !recipe.favorite } : recipe)); renderRecipes(); }
  if (edit) {
    event.preventDefault();
    event.stopPropagation();
    const recipe = recipes.find((item) => item.id === edit.dataset.recipeEdit);
    if (recipe) openRecipeModal(recipe);
    return;
  }
  if (remove) { saveStorage(recipeStorageKey, recipes.filter((recipe) => recipe.id !== remove.dataset.recipeDelete)); renderRecipes(); }
  if (add) {
    const recipe = recipes.find((item) => item.id === add.dataset.recipeAdd);
    const meal = document.querySelector(`[data-recipe-meal="${add.dataset.recipeAdd}"]`).value;
    const portions = Number(document.querySelector(`[data-recipe-portions="${add.dataset.recipeAdd}"]`).value) || 1;
    const total = recipeTotals(recipe.ingredients);
    const journal = getDayJournal();
    journal[currentDate][meal].push({ id: `${Date.now()}-${Math.random()}`, recipeId: recipe.id, isRecipe: true, recipeName: recipe.name, amount: portions, unit: 'portion', calories: total.calories * portions / recipe.servings, protein: total.protein * portions / recipe.servings, carbs: total.carbs * portions / recipe.servings, fats: total.fats * portions / recipe.servings, fiber: total.fiber * portions / recipe.servings });
    saveStorage(storageKeys.journal, journal); renderMeals();
  }
});
renderRecipes();
renderFoodLibrary();

const pageLinks = document.querySelectorAll('[data-page]');
const pageAliases = { 'calculator-section': 'calculator-page', 'recipes-section': 'recipes-page', 'dashboard-section': 'dashboard-page' };

function showPage(pageId) {
  const resolvedPageId = pageAliases[pageId] || pageId;
  const page = document.querySelector(`#${resolvedPageId}`) || document.querySelector('#dashboard-page');
  document.querySelectorAll('.app-page').forEach((item) => item.classList.toggle('is-active', item === page));
  pageLinks.forEach((link) => link.classList.toggle('active', link.dataset.page === page.id));
  if (page.id === 'weekly-report-page') refreshWeeklyReport();
}

pageLinks.forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  const pageId = link.dataset.page;
  showPage(pageId);
  if (window.location.hash !== `#${pageId}`) window.location.hash = pageId;
}));

function navigateToPage() {
  showPage(window.location.hash.slice(1) || 'dashboard-page');
}

window.addEventListener('hashchange', navigateToPage);
navigateToPage();

const supabaseConfig = window.SUPABASE_CONFIG || {};
const supabaseClient = window.supabase && supabaseConfig.url && supabaseConfig.publishableKey
  && !supabaseConfig.url.includes('PASTE_YOUR_') && !supabaseConfig.publishableKey.includes('PASTE_YOUR_')
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  })
  : null;
window.__supabaseClient = supabaseClient;
const authTabs = document.querySelectorAll('[data-auth-tab]');
const authForms = document.querySelectorAll('[data-auth-form]');
const accountStatus = document.querySelector('#account-status');
let activeSupabaseSession = null;

async function saveCalculatorProfile(profile) {
  const journal = readStorage(storageKeys.journal, {});
  journal.calculatorProfile = profile;
  saveStorage(storageKeys.journal, journal);
  if (!supabaseClient || !activeSupabaseSession?.user) return;
  const userId = activeSupabaseSession.user.id;
  const { data: currentProfile } = await supabaseClient
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();
  await supabaseClient
    .from('profiles')
    .update({ settings: { ...(currentProfile?.settings || {}), calculatorProfile: profile } })
    .eq('id', userId);
}

async function restoreCalculatorProfileFromSupabase(session) {
  if (!supabaseClient || !session?.user) return;
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('settings')
    .eq('id', session.user.id)
    .maybeSingle();
  const savedProfile = profile?.settings?.calculatorProfile;
  if (savedProfile) applyCalculatorProfile(savedProfile);
}

function setAuthError(id, message) { document.querySelector(id).textContent = message || ''; }

function setProtectedPagesVisible() {
  document.querySelectorAll('.app-page, .mode-button[data-page]').forEach((item) => { item.hidden = false; });
}

function renderAccountState(session) {
  const signedIn = Boolean(session);
  activeSupabaseSession = session;
  window.__activeSupabaseSession = session;
  if (window.location.hash === '#weekly-report-page') refreshWeeklyReport();
  setProtectedPagesVisible();
  document.querySelector('#login-form').hidden = signedIn;
  document.querySelector('#register-form').hidden = signedIn;
  document.querySelector('#reset-form').hidden = signedIn;
  document.querySelector('.auth-tabs').hidden = signedIn;
  document.querySelector('.auth-reset-link').hidden = signedIn;
  accountStatus.hidden = !signedIn;
  if (!signedIn) return;
  const name = session.user.user_metadata?.display_name || session.user.user_metadata?.name || session.user.email.split('@')[0];
  accountStatus.innerHTML = `<strong>Salut, ${name}!</strong><br>Ești autentificat cu ${session.user.email}.<br><button class="reset-button" type="button" id="logout-button">Ieși din cont</button>`;
  document.querySelector('#logout-button').addEventListener('click', async () => { await supabaseClient.auth.signOut(); });
  restoreCalculatorProfileFromSupabase(session);
  if (window.location.hash === '#account-page') window.location.hash = 'dashboard-page';
}

authTabs.forEach((tab) => tab.addEventListener('click', () => {
  authTabs.forEach((item) => item.classList.toggle('is-active', item === tab));
  authForms.forEach((form) => form.classList.toggle('is-active', form.dataset.authForm === tab.dataset.authTab));
}));

document.querySelector('#register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) { setAuthError('#register-error', 'Completează supabase-config.js cu URL-ul și cheia publică.'); return; }
  const name = document.querySelector('#register-name').value.trim();
  const email = document.querySelector('#register-email').value.trim().toLowerCase();
  const password = document.querySelector('#register-password').value;
  const confirmation = document.querySelector('#register-password-confirm').value;
  if (password !== confirmation) { setAuthError('#register-error', 'Parolele nu coincid.'); return; }
  const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { display_name: name } } });
  setAuthError('#register-error', error?.message || 'Contul a fost creat. Verifică emailul pentru confirmare.');
});

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) { setAuthError('#login-error', 'Completează supabase-config.js cu URL-ul și cheia publică.'); return; }
  const email = document.querySelector('#login-email').value.trim().toLowerCase();
  const password = document.querySelector('#login-password').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  setAuthError('#login-error', error?.message || '');
});

document.querySelector('#reset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) { setAuthError('#reset-error', 'Completează supabase-config.js cu URL-ul și cheia publică.'); return; }
  const email = document.querySelector('#reset-email').value.trim().toLowerCase();
  const redirectTo = `${window.location.origin}${window.location.pathname}#account-page`;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
  setAuthError('#reset-error', error?.message || 'Ți-am trimis un link pentru resetarea parolei.');
});

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((_event, session) => renderAccountState(session));
  supabaseClient.auth.getSession().then(({ data: { session } }) => renderAccountState(session));
} else {
  renderAccountState(null);
}