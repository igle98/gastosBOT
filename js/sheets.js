import { SPREADSHEET_ID, API_BASE, SHEETS, TX_COL, BK_COL, BH_COL } from './config.js';
import { getToken } from './auth.js';
import { setTransactions, setBudgets, setSheetMeta, setBudgetHistory } from './state.js';

// =========================================================
// Carga inicial
// =========================================================

/** Obtiene los sheetId numéricos y los guarda en state.sheetMeta */
export async function loadSheetMeta() {
  const data = await _apiFetch(
    `${API_BASE}/${SPREADSHEET_ID}?fields=sheets.properties`
  );
  const meta = {};
  for (const sheet of data.sheets ?? []) {
    meta[sheet.properties.title] = sheet.properties.sheetId;
  }
  setSheetMeta(meta);
}

/** Carga todas las hojas de datos en paralelo */
export async function loadAll() {
  await Promise.all([loadTransactions(), loadBudgetKeys(), loadBudgetHistory()]);
}

/** Carga TRANSACTIONS y actualiza state */
export async function loadTransactions() {
  const range = `${SHEETS.TRANSACTIONS}!A:O`;
  const data  = await _apiFetch(
    `${API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`
  );
  const rows = data.values ?? [];
  // La fila 0 es la cabecera → los datos empiezan en índice 1
  const txs = [];
  for (let i = 1; i < rows.length; i++) {
    const tx = _parseTransactionRow(rows[i], i);
    if (tx) txs.push(tx);
  }
  setTransactions(txs);
}

/** Carga BUDGET_KEYS y actualiza state (solo los activos) */
export async function loadBudgetKeys() {
  const range = `${SHEETS.BUDGET_KEYS}!A:F`;
  const data  = await _apiFetch(
    `${API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`
  );
  const rows    = data.values ?? [];
  const budgets = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[BK_COL.BUDGET_KEY]) continue;
    // Filtrar por columna "active" (F, índice 5) — checkbox = TRUE/FALSE
    const active = String(row[BK_COL.ACTIVE] ?? '').toUpperCase();
    if (active !== 'TRUE') continue;
    budgets.push({
      budgetKey:      String(row[BK_COL.BUDGET_KEY]).trim(),
      type:           String(row[BK_COL.TYPE] ?? '').trim(),         // "Fijo" o "Variable"
      monthlyBudget:  _parseNumber(row[BK_COL.MONTHLY_BUDGET]),
      fixedAmount:    _parseNumber(row[BK_COL.FIXED_AMOUNT]),
      dueDay:         _parseNumber(row[BK_COL.DUE_DAY]),
    });
  }
  setBudgets(budgets);
}

/** Carga BUDGET_HISTORY completo y actualiza state */
export async function loadBudgetHistory() {
  const range = `${SHEETS.BUDGET_HISTORY}!A:H`;
  let data;
  try {
    data = await _apiFetch(
      `${API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`
    );
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      setBudgetHistory([]);
      return;
    }
    throw err;
  }
  const rows = data.values ?? [];
  const history = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[BH_COL.MONTH] || !row[BH_COL.BUDGET_KEY]) continue;
    history.push({
      month:         String(row[BH_COL.MONTH]).trim(),
      budgetKey:     String(row[BH_COL.BUDGET_KEY]).trim(),
      type:          String(row[BH_COL.TYPE] ?? '').trim(),
      monthlyBudget: _parseNumber(row[BH_COL.MONTHLY_BUDGET]),
      fixedAmount:   _parseNumber(row[BH_COL.FIXED_AMOUNT]),
      dueDay:        _parseNumber(row[BH_COL.DUE_DAY]),
      spent:         _parseNumber(row[BH_COL.SPENT]),
      snapshotTs:    String(row[BH_COL.SNAPSHOT_TS] ?? '').trim(),
    });
  }
  setBudgetHistory(history);
}

/**
 * Upsert del snapshot de presupuesto para el mes indicado.
 * Actualiza filas existentes y hace append de las nuevas.
 * @param {string} month
 * @param {Budget[]} budgets
 * @param {Map<string,number>} spendMap
 */
export async function saveBudgetSnapshot(month, budgets, spendMap) {
  if (!budgets || budgets.length === 0) return;
  const snapshotTs = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).replace(' ', 'T');

  // 1. Leer filas existentes para conocer los rowIndex reales
  const range = `${SHEETS.BUDGET_HISTORY}!A:H`;
  let existingData;
  try {
    existingData = await _apiFetch(
      `${API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`
    );
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      existingData = { values: [] };
    } else {
      throw err;
    }
  }

  const existingRows = existingData.values ?? [];
  // Mapa: `${month}||${budgetKey}` → número de fila en Sheets (1-based)
  const existingMap = new Map();
  for (let i = 1; i < existingRows.length; i++) {
    const row = existingRows[i];
    const rowMonth     = String(row[BH_COL.MONTH]      ?? '').trim();
    const rowBudgetKey = String(row[BH_COL.BUDGET_KEY] ?? '').trim();
    if (rowMonth && rowBudgetKey) {
      existingMap.set(`${rowMonth}||${rowBudgetKey}`, i + 1);
    }
  }

  // 2. Clasificar en update o insert
  const toUpdate = [];
  const toInsert = [];
  for (const b of budgets) {
    const key = `${month}||${b.budgetKey}`;
    const spent = Math.round((spendMap.get(b.budgetKey) ?? 0) * 100) / 100;
    const rowValues = [
      month,
      b.budgetKey,
      b.type,
      b.monthlyBudget,
      b.fixedAmount,
      b.dueDay,
      spent,
      snapshotTs,
    ];
    if (existingMap.has(key)) {
      toUpdate.push({ sheetRow: existingMap.get(key), values: rowValues });
    } else {
      toInsert.push(rowValues);
    }
  }

  // 3. Ejecutar updates en una sola llamada batchUpdate
  if (toUpdate.length > 0) {
    const data = toUpdate.map(({ sheetRow, values }) => ({
      range:  `${SHEETS.BUDGET_HISTORY}!A${sheetRow}:H${sheetRow}`,
      values: [values],
    }));
    await _apiFetch(
      `${API_BASE}/${SPREADSHEET_ID}/values:batchUpdate`,
      { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data }) }
    );
  }

  // 4. Ejecutar inserts en una sola llamada append
  if (toInsert.length > 0) {
    const appendRange = `${SHEETS.BUDGET_HISTORY}!A:H`;
    await _apiFetch(
      `${API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: toInsert }) }
    );
  }

  // 5. Refrescar state local
  await loadBudgetHistory();
}

// =========================================================
// Escritura
// =========================================================

/**
 * Actualiza los campos editables de una transacción.
 * @param {number} rowIndex  Índice 0-based del row en el sheet (header = 0)
 * @param {{ amount?: number, merchantNorm?: string, budgetKey?: string }} fields
 */
export async function updateTransaction(rowIndex, fields) {
  // La fila en A1 notation es 1-based, y la primera fila es el header (row 1)
  // rowIndex=1 → primera fila de datos → fila 2 en A1
  const sheetRow = rowIndex + 1;
  const data = [];

  // amount → columna E, merchant_norm → columna H, budget_key → columna K
  if (fields.amount !== undefined) {
    data.push({ range: `${SHEETS.TRANSACTIONS}!E${sheetRow}`, values: [[String(fields.amount)]] });
  }
  if (fields.merchantNorm !== undefined) {
    data.push({ range: `${SHEETS.TRANSACTIONS}!H${sheetRow}`, values: [[String(fields.merchantNorm)]] });
  }
  if (fields.budgetKey !== undefined) {
    data.push({ range: `${SHEETS.TRANSACTIONS}!K${sheetRow}`, values: [[String(fields.budgetKey)]] });
  }

  if (data.length === 0) return;

  await _apiFetch(
    `${API_BASE}/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: 'POST',
      body:   JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
    }
  );
}

/**
 * Elimina una fila de TRANSACTIONS.
 * @param {number} rowIndex  Índice 0-based (header = 0, primera fila de datos = 1)
 * @param {number} sheetId   Numeric sheetId de TRANSACTIONS (de state.sheetMeta)
 */
export async function deleteTransaction(rowIndex, sheetId) {
  await _apiFetch(
    `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      body:   JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId:    sheetId,
              dimension:  'ROWS',
              startIndex: rowIndex,
              endIndex:   rowIndex + 1,
            },
          },
        }],
      }),
    }
  );
  // Recargamos para obtener los rowIndex correctos (evitar drift)
  await loadTransactions();
}

// =========================================================
// Fetch helper interno
// =========================================================

class SheetsError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name   = 'SheetsError';
  }
}

let _retryingAfter401 = false;

async function _apiFetch(url, options = {}) {
  const token = await getToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !_retryingAfter401) {
    // Token expiró entre la validación y la llamada → reforzamos el flujo
    _retryingAfter401 = true;
    try {
      // Forzamos nuevo token descartando el almacenado
      try { sessionStorage.removeItem('gasto_bot_token'); } catch { /* noop */ }
      const newToken = await getToken();
      const retryRes = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
      _retryingAfter401 = false;
      if (!retryRes.ok) await _throwSheetsError(retryRes);
      return retryRes.json();
    } catch (e) {
      _retryingAfter401 = false;
      throw e;
    }
  }

  _retryingAfter401 = false;

  if (!res.ok) await _throwSheetsError(res);

  // batchUpdate devuelve 200 con body; values.get también
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function _throwSheetsError(res) {
  let msg = `Error ${res.status}`;
  try {
    const body = await res.json();
    msg = body?.error?.message ?? msg;
  } catch { /* noop */ }
  throw new SheetsError(res.status, msg);
}

// =========================================================
// Parsers internos
// =========================================================

/**
 * Parsea una fila del Sheet en un objeto Transaction.
 * @param {string[]} row
 * @param {number} absoluteRowIndex  Índice 0-based incluyendo la cabecera (header=0)
 * @returns {Transaction|null}
 */
function _parseTransactionRow(row, absoluteRowIndex) {
  if (!row || row.length < 3) return null;
  const dateRaw   = row[TX_COL.DATE];
  const amountRaw = row[TX_COL.AMOUNT];
  if (!dateRaw && !amountRaw) return null;

  return {
    rowIndex:    absoluteRowIndex,
    date:        _parseDate(dateRaw),
    amount:      _parseNumber(amountRaw),
    merchantNorm: String(row[TX_COL.MERCHANT_NORM] ?? '').trim(),
    budgetKey:   String(row[TX_COL.BUDGET_KEY]    ?? '').trim(),
    month:       String(row[TX_COL.MONTH]         ?? '').trim(),
  };
}

/**
 * Normaliza una fecha: acepta ISO string (YYYY-MM-DD) o número serial de Sheets.
 */
function _parseDate(value) {
  if (!value) return '';
  const str = String(value).trim();
  // ISO string
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // Número serial de Google Sheets (días desde 30/12/1899)
  const n = Number(str);
  if (!isNaN(n) && n > 1000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  // Intentar parsear otras formas
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}

function _parseNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  // Eliminar todo excepto dígitos, coma, punto y signo negativo
  const clean = String(value).replace(/[^0-9,.\-]/g, '').replace(',', '.');
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}
