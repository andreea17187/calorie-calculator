const form = document.querySelector('#calorie-form');
const errorBox = document.querySelector('#form-error');
const resultsPanel = document.querySelector('#results');
const emptyResults = resultsPanel.querySelector('.results-empty');
const resultsContent = resultsPanel.querySelector('.results-content');

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

function displayResults(values) {
  document.querySelector('#recommended-calories').textContent = formatNumber(values.recommended);
  document.querySelector('#bmr-value').textContent = `${formatNumber(values.bmr)} kcal`;
  document.querySelector('#maintenance-value').textContent = `${formatNumber(values.maintenance)} kcal`;
  document.querySelector('#protein-value').textContent = `${formatNumber(values.protein)} g`;
  document.querySelector('#carbs-value').textContent = `${formatNumber(values.carbs)} g`;
  document.querySelector('#fats-value').textContent = `${formatNumber(values.fats)} g`;
  emptyResults.hidden = true;
  resultsContent.hidden = false;
  resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = getFormData();
  const error = validate(data);
  errorBox.textContent = error;
  if (error) return;
  displayResults(calculateResults(data));
});

form.addEventListener('reset', () => {
  errorBox.textContent = '';
  emptyResults.hidden = false;
  resultsContent.hidden = true;
});