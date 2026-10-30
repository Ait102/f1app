import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Placeholder until a WEC data source is chosen. It promises nothing it
 * cannot show: no calendar or results are drawn without real data.
 */
export function WecHomePage() {
  useEffect(() => {
    document.title = 'Racing Hub · WEC';
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">FIA World Endurance Championship</p>
        <h1>WEC — гонки на выносливость</h1>
        <p className="lead">Раздел в разработке. Сейчас выбираем источник данных.</p>
      </header>

      <div className="state state--empty">
        Данных WEC пока нет: календарь и результаты появятся, когда будет выбран источник с понятной
        лицензией. Ничего не показываем «для примера», чтобы не выдавать придуманное за настоящее.
      </div>

      <div className="grid-2 wec-plan">
        <article className="card">
          <h2 className="card__title">Что будет в разделе</h2>
          <ul className="wec-plan__list">
            <li>Календарь сезона и статусы этапов</li>
            <li>Результаты гонок по классам машин</li>
            <li>Экипажи: несколько пилотов на одну машину</li>
            <li>Зачёты пилотов, производителей и команд</li>
          </ul>
        </article>
        <article className="card">
          <h2 className="card__title">Чем WEC отличается от F1</h2>
          <ul className="wec-plan__list">
            <li>В одной гонке едут несколько классов</li>
            <li>Гонка идёт по времени — от 6 до 24 часов</li>
            <li>Одну машину ведут по очереди 2–3 пилота</li>
          </ul>
        </article>
      </div>

      <p>
        <Link to="/f1">← Пока можно посмотреть Formula 1</Link>
      </p>
    </section>
  );
}
