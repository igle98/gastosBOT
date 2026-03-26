// =========================================================
// CONFIGURACIÓN — reemplaza los valores YOUR_* antes de
// desplegar. Ver README.md para instrucciones paso a paso.
// =========================================================

export const SPREADSHEET_ID   = 'YOUR_SPREADSHEET_ID';
export const OAUTH_CLIENT_ID  = 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com';

export const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export const SHEETS = {
  TRANSACTIONS: 'TRANSACTIONS',
  BUDGET_KEYS:  'BUDGET_KEYS',
  MERCHANT_MAP: 'MERCHANT_MAP',
};

// Índices de columna en la hoja TRANSACTIONS (0-based)
// tx_id | ts_ingest | month | date | amount | currency | merchant_raw | merchant_norm | merchant_base | description | budget_key | type | confidence | merchant_map_source | telegram_message_id
export const TX_COL = {
  TX_ID:              0,
  TS_INGEST:          1,
  MONTH:              2,
  DATE:               3,
  AMOUNT:             4,
  CURRENCY:           5,
  MERCHANT_RAW:       6,
  MERCHANT_NORM:      7,
  MERCHANT_BASE:      8,
  DESCRIPTION:        9,
  BUDGET_KEY:        10,
  TYPE:              11,
  CONFIDENCE:        12,
  MERCHANT_MAP_SRC:  13,
  TELEGRAM_MSG_ID:   14,
};

// Índices de columna en BUDGET_KEYS (0-based)
// budget_key | type | monthly_budget | fixed_amount | due_day | active
export const BK_COL = {
  BUDGET_KEY:     0,
  TYPE:           1,
  MONTHLY_BUDGET: 2,
  FIXED_AMOUNT:   3,
  DUE_DAY:        4,
  ACTIVE:         5,
};

export const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
