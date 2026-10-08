/* Dostaffkin — оформление доставки */
const rates = { xs: 9, s: 13, m: 20, l: 27, xl: 35, max: 70 };
let selectedSize = 'xs';
let selectedRate = rates.xs;
let selectedSpeed = 'regular';
let currentRoute = null;
let routeKm = 0;

const $ = (id) => document.getElementById(id);
const fromInput = $('from');
const toInput = $('to');
const calc = $('calc');
const submit = $('submit');

function validateRoute() {
  calc.disabled = !(fromInput.value.trim() && toInput.value.trim());
}
function validateOrder() {
  submit.disabled = !($('customerName').value.trim() && $('customerPhone').value.trim() && routeKm > 0);
}
function estimateDays(km) {
  if (selectedSpeed === 'fast') {
    return km < 100 ? 'в течение дня' : km < 500 ? '1 день' : km < 1500 ? '1–2 дня' : '2–4 дня';
  }
  return km < 100 ? '1 день' : km < 500 ? '1–2 дня' : km < 1500 ? '2–4 дня' : '4–7 дней';
}
function showPrice(km, durationText) {
  routeKm = km;
  const multiplier = selectedSpeed === 'fast' ? 1.5 : 1;
  $('distanceValue').textContent = `${km.toFixed(1)} км`;
  $('durationValue').textContent = selectedSpeed === 'fast' ? estimateDays(km) : (durationText || estimateDays(km));
  $('rateValue').textContent = `${selectedRate} ₽/км`;
  $('totalValue').textContent = `${Math.ceil(km * selectedRate * multiplier).toLocaleString('ru-RU')} ₽`;
  validateOrder();
}
function resetCalculation() {
  routeKm = 0;
  $('distanceValue').textContent = '—';
  $('durationValue').textContent = '—';
  $('rateValue').textContent = '—';
  $('totalValue').textContent = '—';
  validateOrder();
}

document.querySelectorAll('.main-size-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.main-size-card').forEach((c) => c.classList.remove('is-active'));
    card.classList.add('is-active');
    selectedSize = card.dataset.value;
    selectedRate = Number(card.dataset.rate || rates[selectedSize]);
    if (routeKm) showPrice(routeKm);
  });
});

document.querySelectorAll('.main-speed-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.main-speed-card').forEach((c) => c.classList.remove('is-active'));
    card.classList.add('is-active');
    selectedSpeed = card.dataset.value;
    if (routeKm) showPrice(routeKm);
  });
});

fromInput.addEventListener('input', () => { validateRoute(); resetCalculation(); });
toInput.addEventListener('input', () => { validateRoute(); resetCalculation(); });
$('customerName').addEventListener('input', validateOrder);
$('customerPhone').addEventListener('input', validateOrder);

function initYandexMaps() {
  const map = new ymaps.Map('map', {
    center: [55.751574, 37.573856],
    zoom: 5,
    controls: ['zoomControl']
  });

  new ymaps.SuggestView('from');
  new ymaps.SuggestView('to');

  calc.addEventListener('click', () => {
    const from = fromInput.value.trim();
    const to = toInput.value.trim();
    if (!from || !to) return;

    calc.disabled = true;
    calc.textContent = 'Считаем…';

    // ymaps.route возвращает Promise уже построенного маршрута — так проще
    // и надёжнее получить distance/duration, чем ждать состояние MultiRoute вручную.
    ymaps.route([from, to], {
      mapStateAutoApply: true,
      routingMode: 'auto'
    }).then((newRoute) => {
      if (currentRoute) map.geoObjects.remove(currentRoute);
      currentRoute = newRoute;
      map.geoObjects.add(newRoute);

      const distance = newRoute.getLength();
      const durationSeconds = newRoute.getTime();
      const durationText = durationSeconds < 3600
        ? `${Math.max(1, Math.round(durationSeconds / 60))} мин`
        : `${Math.floor(durationSeconds / 3600)} ч ${Math.round((durationSeconds % 3600) / 60)} мин`;

      showPrice(distance / 1000, durationText);
    }).catch((error) => {
      console.error('Ошибка построения маршрута:', error);
      resetCalculation();
      alert('Яндекс.Карты не смогли построить маршрут. Проверьте адреса и настройки API-ключа.');
    }).then(() => {
      calc.textContent = 'Рассчитать';
      validateRoute();
    });
  });
}

if (window.ymaps) {
  ymaps.ready(initYandexMaps);
} else {
  calc.addEventListener('click', () => {
    alert('Яндекс.Карты не загрузились. Проверьте API-ключ и открывайте страницу через разрешённый домен/localhost, а не file://.');
  });
}

submit.addEventListener('click', () => {
  const id = 'DS' + Date.now().toString().slice(-8);
  $('orderId').textContent = id;
  $('orderForm').style.display = 'none';
  $('orderSuccess').classList.add('is-visible');

  const orders = JSON.parse(localStorage.getItem('dostaffkinOrders') || '{}');
  orders[id] = {
    from: fromInput.value,
    to: toInput.value,
    size: selectedSize,
    speed: selectedSpeed,
    rate: selectedRate,
    distance: routeKm,
    name: $('customerName').value,
    phone: $('customerPhone').value,
    comment: $('comment').value,
    status: 'Создан',
    date: new Date().toLocaleDateString('ru-RU')
  };
  localStorage.setItem('dostaffkinOrders', JSON.stringify(orders));
});
