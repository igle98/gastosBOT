import * as state from '../state.js';
import { getCategoryColor } from '../utils/colors.js';
import { formatCurrency, formatMonth } from '../utils/formatters.js';
import { el } from '../utils/dom.js';

// =========================================================
// Render
// =========================================================

export function render() {
  const container = document.getElementById('reports-content');
  if (!container) return;

  const month     = state.currentMonth;
  const prevMonth = state.getPrevMonth(month);

  container.replaceChildren(
    _sectionWeek(),
    _sectionComparison(month, prevMonth),
    _sectionTopMerchants(month),
  );
}

// =========================================================
// Sección 1: Semana actual por día
// =========================================================

function _sectionWeek() {
  const days = state.getWeeklySpend();
  const max  = Math.max(...days.map(d => d.total), 1);

  const rows = days.map(day => {
    const width = Math.round((day.total / max) * 100);
    return el('div', { class: 'week-day-row' },
      el('div', { class: 'week-day-label' }, day.label),
      el('div', { class: 'week-day-bar-track' },
        el('div', {
          class: 'week-day-bar-fill',
          style: { width: day.total > 0 ? `${width}%` : '0%' },
        }),
      ),
      el('div', { class: 'week-day-amount' },
        day.total > 0 ? formatCurrency(day.total) : '—',
      ),
    );
  });

  return el('div', { class: 'report-section' },
    el('div', { class: 'report-section-title' }, 'Semana actual'),
    ...rows,
  );
}

// =========================================================
// Sección 2: Comparativa mes actual vs mes anterior
// =========================================================

function _sectionComparison(month, prevMonth) {
  const spendCurrent = state.getSpendByCategory(month);
  const spendPrev    = state.getSpendByCategory(prevMonth);

  const allKeys = [...new Set([...spendCurrent.keys(), ...spendPrev.keys()])];

  if (allKeys.length === 0) {
    return el('div', { class: 'report-section' },
      el('div', { class: 'report-section-title' }, `${formatMonth(month)} vs ${formatMonth(prevMonth)}`),
      el('p', { style: { color: 'var(--text-muted)', fontSize: 'var(--text-sm)' } }, 'Sin datos'),
    );
  }

  // Clasificar por delta: sube / baja / igual
  const up    = [];
  const down  = [];
  const equal = [];

  for (const key of allKeys) {
    const curr  = spendCurrent.get(key) ?? 0;
    const prev  = spendPrev.get(key)    ?? 0;
    const delta = curr - prev;
    const entry = { key, curr, delta };
    if (delta > 0.01)       up.push(entry);
    else if (delta < -0.01) down.push(entry);
    else                    equal.push(entry);
  }

  // Ordenar: subidas de mayor a menor (peores primero), bajadas de mayor ahorro primero
  up.sort((a, b) => b.delta - a.delta);
  down.sort((a, b) => a.delta - b.delta);
  equal.sort((a, b) => a.key.localeCompare(b.key));

  const makeRows = items => items.map(({ key, curr, delta }) =>
    el('div', { class: 'compare-row' },
      el('div', { class: 'compare-category', style: { color: getCategoryColor(key) } }, key),
      el('div', { class: 'compare-amount' }, curr > 0 ? formatCurrency(curr) : '—'),
      _deltaChip(delta),
    )
  );

  const makeCol = (items, header, mod) => {
    const rows = items.length > 0
      ? makeRows(items)
      : [el('p', { class: 'compare-col-empty' }, '—')];
    return el('div', { class: `compare-col compare-col-${mod}` },
      el('div', { class: 'compare-col-header' }, header),
      ...rows,
    );
  };

  // Totales
  const totalCurr  = [...spendCurrent.values()].reduce((s, v) => s + v, 0);
  const totalPrev  = [...spendPrev.values()].reduce((s, v)  => s + v, 0);
  const totalDelta = totalCurr - totalPrev;

  return el('div', { class: 'report-section' },
    el('div', { class: 'report-section-title' }, `${formatMonth(month)} vs ${formatMonth(prevMonth)}`),
    el('div', { class: 'compare-columns' },
      makeCol(up,    '↑ Más gasto', 'up'),
      makeCol(down,  '↓ Menos gasto', 'down'),
      makeCol(equal, '= Sin cambio', 'eq'),
    ),
    el('div', { class: 'compare-total-row' },
      el('div', { class: 'compare-category' }, 'TOTAL'),
      el('div', { class: 'compare-amount' }, formatCurrency(totalCurr)),
      _deltaChip(totalDelta),
    ),
  );
}

function _deltaChip(delta) {
  if (Math.abs(delta) < 0.01) {
    return el('div', { class: 'compare-delta delta-eq' }, '=');
  }
  const sign = delta > 0 ? '+' : '';
  const cls  = delta > 0 ? 'delta-up' : 'delta-down';
  return el('div', { class: `compare-delta ${cls}` }, `${sign}${formatCurrency(Math.abs(delta), true)}`);
}

// =========================================================
// Sección 3: Top 5 comercios del mes
// =========================================================

function _sectionTopMerchants(month) {
  const top = state.getTopMerchants(month, 5);

  if (top.length === 0) {
    return el('div', { class: 'report-section' },
      el('div', { class: 'report-section-title' }, 'Top comercios'),
      el('p', { style: { color: 'var(--text-muted)', fontSize: 'var(--text-sm)' } }, 'Sin datos'),
    );
  }

  const rows = top.map(({ merchant, total }, i) =>
    el('div', { class: 'top-merchant-row' },
      el('div', { class: 'top-merchant-rank' }, String(i + 1)),
      el('div', { class: 'top-merchant-name' }, merchant),
      el('div', { class: 'top-merchant-amount' }, formatCurrency(total)),
    )
  );

  return el('div', { class: 'report-section' },
    el('div', { class: 'report-section-title' }, `Top comercios — ${formatMonth(month)}`),
    ...rows,
  );
}
