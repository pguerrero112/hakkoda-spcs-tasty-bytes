import { jwtDecode } from 'jwt-decode';

const VALIDATION = process.env.REACT_APP_CLIENT_VALIDATION || 'Dev';
const BACKEND    = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

export const clientValidation = VALIDATION;
export const backendURL        = BACKEND;

// ── Auth helpers ──────────────────────────────────────────────────────────────

export function enableLogin() {
  return VALIDATION === 'JWT';
}

export function isLoggedIn(state) {
  if (!state) return false;
  if (VALIDATION === 'Dev')       return state.franchise != null;
  return state.accessToken != null;
}

export function decodeToken(token) {
  try { return jwtDecode(token); }
  catch { return null; }
}

// ── Request helpers ───────────────────────────────────────────────────────────

export function getRequestOptions(authState) {
  if (VALIDATION === 'JWT' && authState?.accessToken) {
    return { headers: { Authorization: `Bearer ${authState.accessToken}` } };
  }
  return {};
}

// ── Format helpers ────────────────────────────────────────────────────────────

export function formatCurrency(value) {
  if (value == null) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
