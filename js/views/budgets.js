import * as state from '../state.js';
import { getCategoryColor } from '../utils/colors.js';
import { formatCurrency, calcPercent } from '../utils/formatters.js';
import { el, show, hide } from '../utils/dom.js';

// =========================================================
// Render
// =========================================================

export function render() {
  const totalCard  = document.getElementById('budget-total-card');
  const grid       = document.getElementById('budgets-grid');
  const emptyEl    = document.getElementById('budgets-empty');
  if (!totalCard || !grid) return;

  const month    = state.currentMonth;
  const spendMap = state.getSpendByCategory(month);
  const budgets  = state.budgets;

  if (budgets.length === 0) {
    totalCard.replaceChildren();
    grid.replaceChildren();
    show(emptyEl);
    return;
  }
  hide(emptyEl);

  // Separar por tipo
  const variables = budgets.filter(b => b.type !== 'Fijo');
  const fijos     = budgets.filter(b => b.type === 'Fijo');

  const varSpent    = variables.reduce((s, b) => s + (spendMap.get(b.budgetKey) ?? 0), 0);
  const varBudget   = variables.reduce((s, b) => s + b.monthlyBudget, 0);
  const fixedSpent  = fijos.reduce((s, b) => s + (spendMap.get(b.budgetKey) ?? 0), 0);
  const fixedBudget = fijos.reduce((s, b) => s + b.fixedAmount, 0);

  // Tarjetas resumen arriba
  totalCard.replaceChildren(
    _summaryCard('Gastos Variables', varSpent, varBudget, true),
    _summaryCard('Gastos Fijos', fixedSpent, fixedBudget, false),
  );

  // Tarjetas individuales: primero variables, luego fijos
  const varSorted = [...variables].sort((a, b) => {
    const pA = _pct(spendMap.get(a.budgetKey) ?? 0, a.monthlyBudget);
    const pB = _pct(spendMap.get(b.budgetKey) ?? 0, b.monthlyBudget);
    return pB - pA;
  });

  const fixSorted = [...fijos].sort((a, b) => {
    const aDay = a.dueDay || 0;
    const bDay = b.dueDay || 0;
    // Sin fecha (0) va primero
    if (aDay === 0 && bDay !== 0) return -1;
    if (aDay !== 0 && bDay === 0) return 1;
    // Ordenar por día ascendente
    if (aDay !== bDay) return aDay - bDay;
    // Desempate: no pagados primero
    const aPaid = (spendMap.get(a.budgetKey) ?? 0) > 0 ? 1 : 0;
    const bPaid = (spendMap.get(b.budgetKey) ?? 0) > 0 ? 1 : 0;
    return aPaid - bPaid;
  });

  const cards = [
    ...varSorted.map(b => _variableCard(b, spendMap.get(b.budgetKey) ?? 0)),
    ...(fixSorted.length > 0 ? [_sectionLabel('Gastos Fijos')] : []),
    ...fixSorted.map(b => _fixedCard(b, spendMap.get(b.budgetKey) ?? 0)),
  ];

  grid.replaceChildren(...cards);
}

// =========================================================
// Resumen (Variables / Fijos)
// =========================================================

function _summaryCard(label, spent, budget, showBar) {
  const children = [
    el('div', { class: 'budget-total-label' }, label),
    el('div', { class: 'budget-total-amounts' },
      el('span', { class: 'budget-total-spent' }, formatCurrency(spent)),
      el('span', { class: 'budget-total-sep' }, '/'),
      el('span', { class: 'budget-total-budget' }, formatCurrency(budget)),
    ),
  ];

  if (showBar && budget > 0) {
    const pct      = _pct(spent, budget);
    const cls      = pct > 100 ? 'progress-red' : 'progress-green';
    const barWidth = Math.min(pct, 100);
    children.push(
      el('div', { class: 'budget-total-bar' },
        el('div', {
          class: `budget-total-bar-fill budget-progress-bar ${cls}`,
          style: { width: `${barWidth}%` },
        }),
      ),
    );
  }

  return el('div', { class: 'budget-summary-card' }, ...children);
}

// =========================================================
// Tarjeta Variable (con barra de progreso)
// =========================================================

function _variableCard(budget, spent) {
  const { budgetKey, monthlyBudget } = budget;
  const pct      = _pct(spent, monthlyBudget);
  const isOver   = pct > 100;
  const cls      = isOver ? 'progress-red' : 'progress-green';
  const barWidth = isOver ? 100 : pct;
  const color    = getCategoryColor(budgetKey);
  const pctLabel = isOver ? `${pct}% (+${pct - 100}%)` : `${pct}%`;
  const pctCls   = isOver ? 'pct-red' : 'pct-green';

  return el('div', { class: 'budget-card' },
    el('div', { class: 'budget-card-header' },
      el('div', { class: 'budget-card-name' },
        el('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: '0' } }),
        el('span', {}, budgetKey),
      ),
      el('div', { class: 'budget-card-amounts' },
        el('span', { class: 'spent' }, formatCurrency(spent, true)),
        el('span', {}, ` / ${formatCurrency(monthlyBudget, true)}`),
      ),
    ),
    el('div', { class: 'budget-progress-track' },
      el('div', {
        class: `budget-progress-bar ${cls}`,
        style: { width: `${barWidth}%` },
      }),
    ),
    el('div', { class: `budget-card-percent ${pctCls}` }, pctLabel),
  );
}

// =========================================================
// Tarjeta Fijo (sin barra, con badge PAGADO y día de pago)
// =========================================================

function _fixedCard(budget, spent) {
  const { budgetKey, fixedAmount, dueDay } = budget;
  const color = getCategoryColor(budgetKey);
  const isPaid = spent > 0;

  const rightSide = el('div', { class: 'budget-fixed-right' },
    el('div', { class: 'budget-card-amounts' },
      el('span', { class: 'spent' }, formatCurrency(fixedAmount, true)),
    ),
    isPaid
      ? el('span', { class: 'badge-paid' }, 'PAGADO')
      : el('span', { class: 'badge-pending' }, `Día ~${dueDay}`),
  );

  return el('div', { class: 'budget-card budget-card-fixed' },
    el('div', { class: 'budget-card-header' },
      el('div', { class: 'budget-card-name' },
        el('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: '0' } }),
        el('span', {}, budgetKey),
      ),
      rightSide,
    ),
    !isPaid && dueDay
      ? el('div', { class: 'budget-fixed-due' }, `Pago aprox. día ${dueDay}`)
      : null,
  );
}

// =========================================================
// Separador de sección
// =========================================================

function _sectionLabel(text) {
  return el('div', { class: 'budget-section-label' }, text);
}

// =========================================================
// Helpers
// =========================================================

function _pct(spent, budget) {
  if (!budget || budget === 0) return spent > 0 ? 100 : 0;
  return Math.round((spent / budget) * 100);
}
