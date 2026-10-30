import { useEffect } from 'react';

import { API_BASE } from '../api/client';
import { localTimeZone, utcOffsetLabel } from '../domain/format';
import { PageHeader } from './common';

export function AboutPage() {
  useEffect(() => {
    document.title = 'F1 Season Hub · Источники';
  }, []);
  const tz = localTimeZone();
  return (
    <section className="page prose">
      <PageHeader eyebrow="О проекте" title="Источники данных" />

      <h2>Поставщик</h2>
      <p>
        Все данные загружаются из{' '}
        <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noreferrer">
          Jolpica-F1
        </a>{' '}
        — открытого API, совместимого с Ergast. Базовый адрес: <code>{API_BASE}/</code>. Это{' '}
        <strong>не официальный</strong> API Formula 1; для сверки используйте{' '}
        <a href="https://www.formula1.com/" target="_blank" rel="noreferrer">
          formula1.com
        </a>
        .
      </p>

      <h2>Как приложение работает с данными</h2>
      <ul>
        <li>
          Очки и позиции в зачётах показываются так, как их отдаёт источник. Приложение ничего не
          пересчитывает.
        </li>
        <li>
          Если поле отсутствует у источника, показывается «—» или «Данные недоступны» — значения не
          придумываются.
        </li>
        <li>
          Ответы кэшируются в памяти на 10 минут. Кнопка «Обновить» под каждым блоком загружает данные заново.
        </li>
        <li>
          Последний успешный ответ сохраняется в браузере. Если API недоступен, показываются эти данные с
          пометкой и временем загрузки.
        </li>
        <li>
          Запросы отправляются не чаще ~4 в секунду, чтобы не превышать лимиты API. При HTTP 429 показывается
          сообщение.
        </li>
      </ul>

      <h2>Статусы этапов</h2>
      <ul>
        <li>
          <strong>Завершён</strong> — этап уже учтён источником в зачёте.
        </li>
        <li>
          <strong>Идёт</strong> — сейчас между началом первой сессии и примерно тремя часами после старта
          гонки.
        </li>
        <li>
          <strong>Ждём результаты</strong> — гонка прошла по расписанию, но источник ещё не опубликовал итог.
        </li>
        <li>
          <strong>Предстоящий</strong> — уик-энд ещё не начался.
        </li>
        <li>Отменённые и перенесённые этапы не отмечаются: Jolpica-F1 не передаёт такой статус.</li>
      </ul>

      <h2>Время</h2>
      <p>
        Время сессий показано в вашей зоне: <strong>{tz}</strong> ({utcOffsetLabel(tz)}). Исходное UTC-время
        видно во всплывающей подсказке при наведении. Если источник публикует только дату, время не
        показывается.
      </p>

      <h2>Лицензия и условия</h2>
      <ul>
        <li>
          Данные Jolpica-F1 распространяются по лицензии{' '}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ru"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>
          : с указанием источника, только в некоммерческих целях, производные данные — на тех же условиях.
        </li>
        <li>
          Проект некоммерческий и соблюдает{' '}
          <a href="https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md" target="_blank" rel="noreferrer">
            условия использования
          </a>{' '}
          и{' '}
          <a
            href="https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md"
            target="_blank"
            rel="noreferrer"
          >
            лимиты
          </a>{' '}
          Jolpica-F1 (без токена: 4 запроса в секунду, 500 в час). Для коммерческого использования нужно
          отдельное согласование с владельцами API.
        </li>
        <li>
          Jolpica-F1 поддерживается волонтёрами и не гарантирует доступность и точность данных. Официальные
          результаты — на{' '}
          <a href="https://www.formula1.com/" target="_blank" rel="noreferrer">
            formula1.com
          </a>
          .
        </li>
        <li>
          Схемы трасс (контуры) взяты из проекта{' '}
          <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">
            F1DB
          </a>{' '}
          и распространяются по лицензии{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/deed.ru" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>{' '}
          с указанием источника. Длина, число поворотов и направление движения — оттуда же.
        </li>
        <li>
          Formula 1, F1 и связанные знаки принадлежат Formula One Licensing B.V.; проект с ними не связан.
        </li>
      </ul>
    </section>
  );
}
