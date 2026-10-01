/* JOBRADAR — natural-language query parser.
   "Finance Manager or Financial Controller jobs in Belgium, Netherlands or
   Germany, requiring English but not Dutch, posted during the last week."
   → structured SearchProfile draft, shown as "Here's what I understood". */

import type { HardFilterKey, LanguageRequirement, RemoteType, SearchProfile, Seniority } from './types';
import { createEmptyProfile } from './types';
import { ALL_COUNTRIES, REGION_NAMES } from './geo';
import { LANGUAGES, TITLE_GROUPS } from './taxonomies';
import { SENIORITY_LABEL } from './types';

export interface NLParseResult {
  profile: SearchProfile;
  understood: string[];
  warnings: string[];
}

const norm = (s: string) => s.toLowerCase();

function findAll(hay: string, candidates: string[]): string[] {
  const found: string[] = [];
  for (const c of candidates) {
    const re = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(hay) && !found.includes(c)) found.push(c);
  }
  return found;
}

export function parseNaturalLanguage(input: string): NLParseResult {
  const profile = createEmptyProfile('Natural language search');
  const understood: string[] = [];
  const warnings: string[] = [];
  const text = input.trim();
  const lower = norm(text);

  // --- titles ---
  const titles = findAll(lower, TITLE_GROUPS);
  if (titles.length) {
    profile.titles = titles;
    understood.push(`Roles: ${titles.join(' · ')}`);
  }

  // --- locations ---
  const countries = findAll(lower, ALL_COUNTRIES);
  const regions = findAll(lower, REGION_NAMES);
  const locTokens = [...regions, ...countries];
  // "EU" shorthand
  if (/\beu\b/.test(lower) && !locTokens.includes('European Union')) locTokens.push('European Union');
  if (locTokens.length) {
    profile.locations = locTokens;
    understood.push(`Locations: ${locTokens.join(' · ')}`);
  }

  // --- remote ---
  const remote: RemoteType[] = [];
  if (/\bremote\b/.test(lower)) {
    remote.push('remote');
    if (/\bworldwide\b|\bglobal\b/.test(lower)) remote.push('remote_worldwide');
    else if (/\beurope\b/.test(lower)) remote.push('remote_europe');
    else if (/\beu\b/.test(lower)) remote.push('remote_eu');
    const fromM = lower.match(/remote[^.]{0,30}\bfrom\s+([a-z ]+)/);
    if (fromM) {
      const c = ALL_COUNTRIES.find((cc) => norm(cc) === fromM[1].trim());
      if (c) { remote.push('remote_country'); profile.remoteFromCountry = c; }
    }
  }
  if (/\bhybrid\b/.test(lower)) remote.push('hybrid');
  if (/\bon[\s-]?site\b/.test(lower)) remote.push('on_site');
  if (remote.length) {
    profile.remote = [...new Set(remote)];
    understood.push(`Work model: ${profile.remote.join(' · ')}`);
  }

  // --- languages ---
  const langs: LanguageRequirement[] = [];
  for (const lang of LANGUAGES) {
    const l = norm(lang);
    const mentioned = new RegExp(`\\b${l}\\b`).test(lower);
    if (!mentioned) continue;
    // exclusion: "not Dutch", "but not Dutch", "no Dutch required"... careful with "not ... mandatory"
    const excl = new RegExp(`\\b(not|no|without|excluding|except)\\b[^.]{0,25}\\b${l}\\b`).test(lower);
    const required = new RegExp(`\\b${l}\\b[^.]{0,30}\\b(required|mandatory|must|fluent|essential)\\b|\\b(requiring|requires|require)\\b[^.]{0,30}\\b${l}\\b`).test(lower);
    const preferred = new RegExp(`\\b${l}\\b[^.]{0,40}\\b(preferred|advantage|plus|desirable|valued|a bonus)\\b`).test(lower);
    if (excl) langs.push({ language: lang, level: 'exclude_if_mandatory' });
    else if (required) langs.push({ language: lang, level: 'required' });
    else if (preferred) langs.push({ language: lang, level: 'preferred' });
    else langs.push({ language: lang, level: 'optional' });
  }
  if (langs.length) {
    profile.languages = langs;
    profile.hardFilters = [...new Set<HardFilterKey>([...profile.hardFilters, 'language'])];
    understood.push(`Languages: ${langs.map((x) => `${x.language} (${x.level})`).join(' · ')}`);
  }

  // --- seniority ---
  const seniorities: Seniority[] = [];
  (Object.keys(SENIORITY_LABEL) as Seniority[]).forEach((s) => {
    const label = norm(SENIORITY_LABEL[s]);
    if (new RegExp(`\\b${label}\\b`).test(lower) && !seniorities.includes(s)) seniorities.push(s);
  });
  if (seniorities.length) {
    profile.seniority = seniorities;
    understood.push(`Seniority: ${seniorities.map((s) => SENIORITY_LABEL[s]).join(' · ')}`);
  }

  // --- experience ---
  const expM = lower.match(/(\d+)\s*\+?\s*years?( of)? experience|(\d+)\s*\+?\s*(yoe|yrs)/);
  if (expM) {
    profile.experienceMin = parseInt(expM[1] || expM[3], 10);
    understood.push(`Experience: ${profile.experienceMin}+ years`);
  }

  // --- date posted ---
  if (/\blast\s*(24\s*hours|day)\b|\btoday\b/.test(lower)) profile.datePosted = '24h';
  else if (/\blast\s*week\b|\blast\s*7\s*days\b|\bduring the last week\b/.test(lower)) profile.datePosted = '7d';
  else if (/\blast\s*3\s*days\b/.test(lower)) profile.datePosted = '3d';
  else if (/\blast\s*2\s*weeks\b|\blast\s*14\s*days\b/.test(lower)) profile.datePosted = '14d';
  else if (/\blast\s*month\b|\blast\s*30\s*days\b/.test(lower)) profile.datePosted = '30d';
  if (profile.datePosted !== 'any') {
    understood.push(`Posted: ${profile.datePosted}`);
    profile.hardFilters = [...new Set<HardFilterKey>([...profile.hardFilters, 'date'])];
  }

  // --- exclusions ---
  const exclM = lower.match(/\b(excluding|except|not)\s+([a-z ,&]+?)(,|\.| and |$)/g);
  if (exclM) {
    const terms = exclM
      .flatMap((m) => m.replace(/\b(excluding|except|not)\b/g, '').split(/,| and /))
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !LANGUAGES.some((l) => norm(l) === t));
    if (terms.length) {
      profile.excludedTitles = terms.map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase()));
      understood.push(`Excluding: ${profile.excludedTitles.join(' · ')}`);
    }
  }

  // --- salary ---
  const salM = lower.match(/(?:€|\$|£)\s?([\d.,]+)\s?k?/);
  if (salM && /\bsalary\b|\bpay\b|\bcompensation\b/.test(lower)) {
    let n = parseFloat(salM[1].replace(',', '.'));
    if (/k\b/.test(lower)) n *= 1000;
    profile.salaryMin = Math.round(n);
    understood.push(`Salary min: ${profile.salaryMin}`);
  }

  // --- visa / relocation ---
  if (/\bvisa\s*sponsorship\b|\bsponsor\w*\s*visa\b/.test(lower)) {
    profile.visaSponsorship = true;
    understood.push('Visa sponsorship wanted');
  }
  if (/\brelocation\b/.test(lower)) {
    profile.relocation = true;
    understood.push('Relocation wanted');
  }

  if (!understood.length) {
    warnings.push('I could not extract structured criteria — try adding a role, a location or a language.');
    // fallback: treat whole input as keywords
    profile.shouldKeywords = text.split(/\s+/).filter((w) => w.length > 3).slice(0, 8);
  }

  return { profile, understood, warnings };
}
