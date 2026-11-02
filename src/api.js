const apiKey = import.meta.env.VITE_FAVORIT_API_KEY || '00000000-0000-0000-0000-000000000001';

const errors = {
  'Empty key!': 'Не указан ключ API.',
  'Invalid key client!': 'Ключ API недействителен.',
  'Empty number goods!': 'Введите артикул детали.',
  'Request quota exceeded!': 'Превышен лимит запросов. Попробуйте позже.',
};

export async function fetchGoods({ number, brand, signal }) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20000);

  try {
    const url = new URL('https://api.favorit-parts.ru/hs/hsprice/');
    url.search = new URLSearchParams({
      key: apiKey,
      number,
      ...(brand ? { brand, analogues: 'on' } : {}),
    }).toString();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Сервис недоступен (HTTP ${response.status}). Попробуйте позже.`);
    const text = await response.text();
    if (!text.trim()) return [];
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Сервис вернул некорректный ответ. Повторите запрос.');
    }
    if (data?.error) {
      const message = String(data.error);
      const translated = Object.entries(errors)
        .filter(([key]) => message.includes(key))
        .map(([, value]) => value);
      throw new Error(translated.length ? translated.join(' ') : message);
    }
    if (!Array.isArray(data?.goods)) throw new Error('Неожиданный формат ответа сервиса.');
    return data.goods.filter((item) => item && typeof item.brand === 'string' && item.brand.trim());
  } catch (error) {
    if (timedOut) throw new Error('Сервис не ответил за 20 секунд. Повторите запрос.');
    if (error.name === 'TypeError') throw new Error('Не удалось связаться с сервисом. Проверьте подключение и повторите запрос.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export function getOffers(goods) {
  const products = new Map();
  for (const good of goods) {
    for (const item of [good, ...(Array.isArray(good.analogues) ? good.analogues : [])]) {
      if (!item?.brand || !item?.number) continue;
      const key = item.goodsID || `${item.brand}:${item.number}`;
      if (!products.has(key)) products.set(key, item);
    }
  }
  return [...products.values()].flatMap((item) => {
    const warehouses = Array.isArray(item.warehouses) ? item.warehouses.filter(Boolean) : [];
    return (warehouses.length ? warehouses : [null]).map((warehouse) => ({
      brand: item.brand,
      number: item.number,
      name: item.name || 'Название не указано',
      warehouse: warehouse ? warehouse.code || warehouse.id || 'Склад' : 'Нет предложений',
      price: warehouse?.price ?? null,
      stock: warehouse?.stock ?? (warehouse ? null : 0),
    }));
  });
}
