/* JOBRADAR — normalization utilities: titles, fuzzy text, languages,
   experience, salary parsing & conversion, dates. No external AI needed. */

import { SENIORITY_ORDER, type Seniority } from './types';

/* ---------- title normalization ---------- */

export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleTokens(raw: string): string[] {
  return normalizeTitle(raw).split(' ').filter((t) => t.length > 1 && !isNoiseWord(t));
}

function isNoiseWord(t: string): boolean {
  return ['the', 'and', 'for', 'with', 'our', 'new', 'now', 'hiring'].includes(t);
}

/* ---------- fuzzy matching ---------- */

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const cur = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return dp[n];
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a), tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return (2 * inter) / (ta.size + tb.size);
}

/** 0..1 similarity between two job titles, token-aware. */
export function fuzzyTitleMatch(a: string, b: string): number {
  const na = normalizeTitle(a), nb = normalizeTitle(b);
  if (na === nb) return 1;
  const ta = new Set(titleTokens(a)), tb = new Set(titleTokens(b));
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const tokenScore = (2 * overlap) / (ta.size + tb.size || 1);
  const tri = trigramSimilarity(na, nb);
  return Math.max(tokenScore * 0.7 + tri * 0.3, tri * 0.85);
}

/* ---------- seniority inference ---------- */

const SENIORITY_PATTERNS: { re: RegExp; level: Seniority }[] = [
  { re: /\b(cfo|ceo|cto|coo|cmo|cio)\b/i, level: 'c_level' },
  { re: /\b(svp|evp|vice president|\bvp\b)\b/i, level: 'vp' },
  { re: /\bhead of\b/i, level: 'head' },
  { re: /\bsenior manager\b/i, level: 'senior_manager' },
  { re: /\bdirector\b/i, level: 'director' },
  { re: /\bmanager\b/i, level: 'manager' },
  { re: /\blead\b|\bteam lead\b|\bleader\b/i, level: 'lead' },
  { re: /\bsenior\b|\bsr\.?\b/i, level: 'senior' },
  { re: /\bmid[\s-]?level\b/i, level: 'mid' },
  { re: /\bassociate\b/i, level: 'associate' },
  { re: /\bjunior\b|\bjr\.?\b/i, level: 'junior' },
  { re: /\bintern(ship)?\b/i, level: 'intern' },
  { re: /\bentry[\s-]?level\b|\bgraduate\b/i, level: 'entry' },
];

export function inferSeniority(title: string, description = ''): Seniority {
  const text = `${title} ${description.slice(0, 800)}`;
  for (const p of SENIORITY_PATTERNS) {
    if (p.re.test(text)) return p.level;
  }
  return 'mid';
}

export function seniorityRank(s: Seniority): number {
  return SENIORITY_ORDER.indexOf(s);
}

/* ---------- language extraction ---------- */

const LANG_ALIASES: Record<string, string> = {
  english: 'English', spanish: 'Spanish', french: 'French', german: 'German',
  italian: 'Italian', portuguese: 'Portuguese', dutch: 'Dutch', arabic: 'Arabic',
  chinese: 'Chinese', mandarin: 'Chinese', japanese: 'Japanese', polish: 'Polish',
  swedish: 'Swedish',
};

const REQUIRED_PATTERNS = [
  /\b(english|spanish|french|german|italian|portuguese|dutch|arabic|chinese|mandarin|japanese|polish|swedish)\s+(is\s+)?required\b/i,
  /\brequired[:\s]+(english|spanish|french|german|italian|portuguese|dutch|arabic|chinese|mandarin|japanese|polish|swedish)\b/i,
  /\bmust\s+(speak|have|be fluent in)\s+(english|spanish|french|german|italian|portuguese|dutch|arabic|chinese|mandarin|japanese|polish|swedish)\b/i,
  /\bfluent\s+(in\s+)?(english|spanish|french|german|italian|portuguese|dutch|arabic|chinese|mandarin|japanese|polish|swedish)\b/i,
  /\b(english|spanish|french|german|italian|portuguese|dutch|arabic|chinese|mandarin|japanese|polish|swedish)\s*[-–—:]\s*(fluent|native|c1|c2|mandatory)\b/i,
];

const PREFERRED_PATTERNS = [
  /\b(english|spanish|french|german|italian|portuguese|dutch|arabic|chinese|mandarin|japanese|polish|swedish)\b[^.]{0,60}\b(advantage|plus|preferred|desirable|a bonus|would be (an? )?advantage|nice to have)\b/i,
  /\b(advantage|plus|preferred|desirable)[^.]{0,40}\b(english|spanish|french|german|italian|portuguese|dutch|arabic|chinese|mandarin|japanese|polish|swedish)\b/i,
];

export function extractLanguages(text: string): { required: string[]; preferred: string[] } {
  const required = new Set<string>();
  const preferred = new Set<string>();
  const lower = text.toLowerCase();
  for (const p of REQUIRED_PATTERNS) {
    const m = lower.match(p);
    if (m) {
      const lang = Object.keys(LANG_ALIASES).find((k) => m[0].includes(k));
      if (lang) required.add(LANG_ALIASES[lang]);
    }
  }
  for (const p of PREFERRED_PATTERNS) {
    const m = lower.match(p);
    if (m) {
      const lang = Object.keys(LANG_ALIASES).find((k) => m[0].includes(k));
      if (lang && !required.has(LANG_ALIASES[lang])) preferred.add(LANG_ALIASES[lang]);
    }
  }
  return { required: [...required], preferred: [...preferred] };
}

/* ---------- experience extraction ---------- */

export function extractExperienceYears(text: string): { min?: number; max?: number } {
  const m = text.match(/(\d+)\s*(?:\+|or more|years? of experience|years?'? experience)/i)
    || text.match(/(\d+)\s*-\s*(\d+)\s*years?/i)
    || text.match(/minimum of (\d+)\s*years?/i);
  if (!m) return {};
  if (m[2]) return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
  return { min: parseInt(m[1], 10) };
}

/* ---------- salary ---------- */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', 'CHF': 'CHF', 'kr': 'SEK', 'zł': 'PLN',
};

/** Static indicative rates to EUR (approximate; salary filters use these for cross-currency comparison). */
export const FX_TO_EUR: Record<string, number> = {
  EUR: 1, USD: 0.92, GBP: 1.17, CHF: 1.05, SEK: 0.088, NOK: 0.086, DKK: 0.134,
  PLN: 0.23, CZK: 0.04, HUF: 0.0025, RON: 0.20, CAD: 0.67, AUD: 0.60, JPY: 0.0061,
  AED: 0.25, SAR: 0.245, ZAR: 0.05, KES: 0.0071, BRL: 0.18, MXN: 0.054, INR: 0.011,
};

export function convertSalary(amount: number, from: string, to = 'EUR'): number {
  const f = FX_TO_EUR[from?.toUpperCase()] ?? 1;
  const t = FX_TO_EUR[to.toUpperCase()] ?? 1;
  return Math.round((amount * f) / t);
}

export function annualize(amount: number, period: 'annual' | 'monthly' | 'hourly'): number {
  if (period === 'monthly') return amount * 12;
  if (period === 'hourly') return amount * 2080;
  return amount;
}

export function formatSalaryCompact(
  min?: number, max?: number, currency = 'EUR',
): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : `${currency} `;
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${Math.round(n)}`;
  if (min == null && max == null) return 'Not specified';
  if (min != null && max != null) return `${sym}${fmt(min)}–${sym}${fmt(max)}`;
  return `${sym}${fmt(min ?? max ?? 0)}+`;
}

/* ---------- dates ---------- */

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export function timeAgo(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    return h <= 1 ? 'Just now' : `${h} hours ago`;
  }
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

export function datePostedCutoff(filter: string): number | null {
  const map: Record<string, number | null> = {
    any: null, today: 1, '24h': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30,
  };
  return map[filter] ?? null;
}
