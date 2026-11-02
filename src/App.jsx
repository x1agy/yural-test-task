import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { brandSelected, loadBrands, loadOffers, numberChanged } from './store';

const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' });

function Loader({ children }) {
  return <div className="status-box" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" />{children}</div>;
}

function ErrorMessage({ message, onRetry }) {
  return <div className="alert alert-danger d-flex flex-wrap align-items-center gap-3 mb-0" role="alert"><span className="flex-grow-1">{message}</span><button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Повторить</button></div>;
}

export default function App() {
  const dispatch = useDispatch();
  const { number, brand, brands, offers } = useSelector((state) => state.search);
  const [brandRetry, setBrandRetry] = useState(0);
  const [offerRetry, setOfferRetry] = useState(0);

  useEffect(() => {
    if (!number.trim()) return;
    let request;
    const timer = setTimeout(() => { request = dispatch(loadBrands(number.trim())); }, 500);
    return () => {
      clearTimeout(timer);
      request?.abort();
    };
  }, [number, brandRetry, dispatch]);

  useEffect(() => {
    if (!brand) return;
    const request = dispatch(loadOffers({ number: number.trim(), brand }));
    return () => request.abort();
  }, [number, brand, offerRetry, dispatch]);

  return (
    <>
      <header className="topbar">
        <div className="container d-flex align-items-center justify-content-between gap-3">
          <a className="wordmark" href="./"><span className="brand-symbol" aria-hidden="true">П</span>ПОДБОР<span className="wordmark-light"> / запчасти</span></a>
          <span className="service-label">Каталог Favorit Parts</span>
        </div>
      </header>
      <main className="container py-4 py-md-5">
        <div className="intro">
          <p className="eyebrow">ПОИСК ПО АРТИКУЛУ</p>
          <h1>Нужная деталь.<br /><span>И все её аналоги.</span></h1>
          <p className="intro-copy">Введите артикул и выберите производителя.<br className="d-none d-sm-block" /> Сравните цены и наличие на складах.</p>
        </div>

        <section className="search-panel" aria-labelledby="search-title">
          <div className="section-heading"><span className="step-number">01</span><h2 id="search-title">Артикул и производитель</h2></div>
          <label className="form-label fw-semibold" htmlFor="part-number">Артикул детали</label>
          <div className="input-wrap">
            <svg className="search-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input id="part-number" className="form-control form-control-lg" value={number} onChange={(event) => dispatch(numberChanged(event.target.value))} placeholder="Например, 01089" autoComplete="off" spellCheck="false" aria-describedby="search-hint" />
            {number && <button className="clear-input" aria-label="Очистить артикул" onClick={() => dispatch(numberChanged(''))}>×</button>}
          </div>
          <p id="search-hint" className="form-text mb-0">Поиск начнётся автоматически после ввода.</p>

          <div className="brand-results" aria-live="polite" aria-busy={brands.status === 'loading'}>
            {!number.trim() && <p className="muted mb-0">Здесь появятся производители с указанным артикулом.</p>}
            {number.trim() && brands.status === 'idle' && <p className="muted mb-0">Ожидание ввода…</p>}
            {brands.status === 'loading' && <Loader>Ищем производителей…</Loader>}
            {brands.status === 'failed' && <ErrorMessage message={brands.error} onRetry={() => setBrandRetry((value) => value + 1)} />}
            {brands.status === 'succeeded' && (brands.items.length ? <>
              <div className="d-flex justify-content-between gap-3 mb-3"><p className="small fw-semibold mb-0">Выберите производителя</p><span className="small muted">Найдено: {brands.items.length}</span></div>
              <div className="d-flex flex-wrap gap-2" role="group" aria-label="Производители">
                {brands.items.map((item) => <button key={item} className={`brand-button ${brand === item ? 'selected' : ''}`} aria-pressed={brand === item} onClick={() => { if (brand !== item) dispatch(brandSelected(item)); }}>{item}{brand === item && <span aria-hidden="true"> ✓</span>}</button>)}
              </div>
            </> : <div className="empty-state compact"><strong>Производители не найдены</strong><p>Проверьте артикул или введите другой номер детали.</p></div>)}
          </div>
        </section>

        <section className="offers-panel" aria-labelledby="offers-title" aria-busy={offers.status === 'loading'}>
          <div className="section-heading flex-wrap"><span className="step-number">02</span><h2 id="offers-title">Предложения и аналоги</h2>{brand && <span className="selection-label">{brand} · {number.trim()}</span>}</div>
          <div aria-live="polite">
            {!brand && <div className="empty-state"><span className="empty-icon" aria-hidden="true">↳</span><strong>Сначала выберите производителя</strong><p>Покажем деталь, её аналоги, цены и остатки.</p></div>}
            {brand && (offers.status === 'loading' || offers.status === 'idle') && <Loader>Загружаем предложения и аналоги…</Loader>}
            {offers.status === 'failed' && <ErrorMessage message={offers.error} onRetry={() => setOfferRetry((value) => value + 1)} />}
            {offers.status === 'succeeded' && (offers.items.length ? <>
              <p className="result-count">Позиций: <strong>{offers.items.length}</strong><span>Цена и остаток указаны для каждого склада</span></p>
              <div className="table-responsive" tabIndex={0} role="region" aria-label="Таблица предложений">
                <table className="table align-middle mb-0">
                  <caption className="visually-hidden">Предложения и аналоги для {brand}, артикул {number}</caption>
                  <thead><tr><th scope="col">Деталь / производитель</th><th scope="col">Артикул</th><th scope="col">Склад</th><th scope="col" className="text-end">Цена</th><th scope="col" className="text-end">Остаток</th></tr></thead>
                  <tbody>{offers.items.map((item, index) => <tr key={`${item.brand}:${item.number}:${index}`}>
                    <td className="product-cell"><strong>{item.brand}</strong><span>{item.name}</span></td>
                    <td className="article-cell">{item.number}</td>
                    <td>{item.warehouse}</td>
                    <td className="text-end price-cell">{item.price !== null && Number.isFinite(Number(item.price)) ? currency.format(Number(item.price)) : 'Не указана'}</td>
                    <td className="text-end"><span className={Number(item.stock) > 0 ? 'stock available' : 'stock'}>{item.stock === null ? 'Не указан' : Number(item.stock) === 0 ? 'Нет в наличии' : `${item.stock} шт.`}</span></td>
                  </tr>)}</tbody>
                </table>
              </div>
            </> : <div className="empty-state"><strong>Предложений не найдено</strong><p>Выберите другого производителя или измените артикул.</p></div>)}
          </div>
        </section>
        <footer>Данные о ценах и наличии предоставлены Favorit Parts.</footer>
      </main>
    </>
  );
}
