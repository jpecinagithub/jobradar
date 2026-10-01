/* JOBRADAR — geographical taxonomy (admin-editable seed). */

export const REGIONS: Record<string, string[]> = {
  'Europe': [
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
    'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia',
    'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
    'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg',
    'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia',
    'Norway', 'Poland', 'Portugal', 'Romania', 'San Marino', 'Serbia', 'Slovakia',
    'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican City',
  ],
  'European Union': [
    'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
    'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
    'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
    'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
    'Spain', 'Sweden',
  ],
  'Eurozone': [
    'Austria', 'Belgium', 'Croatia', 'Cyprus', 'Estonia', 'Finland', 'France',
    'Germany', 'Greece', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
    'Malta', 'Netherlands', 'Portugal', 'Slovakia', 'Slovenia', 'Spain',
  ],
  'DACH': ['Germany', 'Austria', 'Switzerland'],
  'Benelux': ['Belgium', 'Netherlands', 'Luxembourg'],
  'Nordics': ['Denmark', 'Finland', 'Iceland', 'Norway', 'Sweden'],
  'Baltics': ['Estonia', 'Latvia', 'Lithuania'],
  'Balkans': [
    'Albania', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Greece',
    'Kosovo', 'Montenegro', 'North Macedonia', 'Romania', 'Serbia', 'Slovenia',
  ],
  'Iberia': ['Spain', 'Portugal'],
  'Middle East': [
    'Bahrain', 'Cyprus', 'Egypt', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait',
    'Lebanon', 'Oman', 'Qatar', 'Saudi Arabia', 'Syria', 'Turkey', 'UAE', 'Yemen',
  ],
  'GCC': ['Bahrain', 'Kuwait', 'Oman', 'Qatar', 'Saudi Arabia', 'UAE'],
  'Africa': [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
    'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad', 'Comoros',
    'Congo', 'DR Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea',
    'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
    'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi',
    'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger',
    'Nigeria', 'Rwanda', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
    'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia',
    'Uganda', 'Zambia', 'Zimbabwe',
  ],
  'East Africa': [
    'Burundi', 'Comoros', 'Djibouti', 'Eritrea', 'Ethiopia', 'Kenya',
    'Madagascar', 'Malawi', 'Mauritius', 'Mozambique', 'Rwanda', 'Seychelles',
    'Somalia', 'South Sudan', 'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe',
  ],
  'West Africa': [
    'Benin', 'Burkina Faso', 'Cape Verde', 'Gambia', 'Ghana', 'Guinea',
    'Guinea-Bissau', 'Ivory Coast', 'Liberia', 'Mali', 'Mauritania', 'Niger',
    'Nigeria', 'Senegal', 'Sierra Leone', 'Togo',
  ],
  'North America': ['Canada', 'Mexico', 'United States'],
  'Latin America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
    'Dominican Republic', 'Ecuador', 'El Salvador', 'Guatemala', 'Honduras',
    'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'Uruguay', 'Venezuela',
  ],
  'APAC': [
    'Australia', 'Bangladesh', 'Cambodia', 'China', 'Fiji', 'India', 'Indonesia',
    'Japan', 'Laos', 'Malaysia', 'Mongolia', 'Myanmar', 'Nepal', 'New Zealand',
    'Pakistan', 'Papua New Guinea', 'Philippines', 'Singapore', 'South Korea',
    'Sri Lanka', 'Taiwan', 'Thailand', 'Vietnam',
  ],
  'Worldwide': [], // special: matches any remote job
};

export const COUNTRY_TO_CONTINENT: Record<string, string> = {};
for (const [region, countries] of Object.entries(REGIONS)) {
  if (['Europe', 'Africa', 'North America', 'Latin America', 'APAC', 'Middle East'].includes(region)) {
    for (const c of countries) {
      if (region === 'Latin America' && c === 'Mexico') continue; // keep North America
      if (!(c in COUNTRY_TO_CONTINENT)) COUNTRY_TO_CONTINENT[c] = region;
    }
  }
}
COUNTRY_TO_CONTINENT['Mexico'] = 'North America';

export const ALL_COUNTRIES: string[] = Array.from(
  new Set(Object.values(REGIONS).flat()),
).sort();

export const REGION_NAMES: string[] = Object.keys(REGIONS);

/** Expand a location token (country, region, continent, 'EU', 'Worldwide', 'Remote') to countries. */
export function expandLocation(token: string): string[] {
  const t = token.trim();
  const lower = t.toLowerCase();
  if (lower === 'eu' || lower === 'e.u.') return REGIONS['European Union'];
  if (lower === 'worldwide' || lower === 'global' || lower === 'remote') return [];
  for (const name of REGION_NAMES) {
    if (name.toLowerCase() === lower) return REGIONS[name];
  }
  const country = ALL_COUNTRIES.find((c) => c.toLowerCase() === lower);
  return country ? [country] : [];
}

export function isRemoteToken(token: string): boolean {
  const t = token.trim().toLowerCase();
  return ['remote', 'worldwide', 'global', 'work from home', 'wfh'].includes(t);
}

/** Does the job's country fall inside any of the location tokens? */
export function locationMatchesCountry(
  jobCountry: string | undefined,
  tokens: string[],
): boolean {
  if (!jobCountry) return false;
  const jc = jobCountry.toLowerCase();
  for (const token of tokens) {
    if (isRemoteToken(token)) continue;
    const expanded = expandLocation(token);
    if (expanded.some((c) => c.toLowerCase() === jc)) return true;
  }
  return false;
}
