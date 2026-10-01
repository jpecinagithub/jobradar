/* ============================================================
   JOBRADAR — core domain types
   Brand name is encapsulated in `BRAND` so it can be swapped.
   ============================================================ */

export const BRAND = {
  name: 'JOBRADAR',
  claim: 'Search less. Find better.',
  heroTitle: 'Find the right job. Not more jobs.',
  heroSubtitle: 'Search multiple job sources at once. One clean list. No ads. No duplicates.',
} as const;

/* ---------------- Sources ---------------- */

export type SourceType =
  | 'PRIMARY'           // job hosted / published originally (company careers page)
  | 'ATS'               // pulled directly from the hiring platform
  | 'SPECIALIST_BOARD'  // sector portal
  | 'OFFICIAL'          // public / institutional body
  | 'AGGREGATOR'        // indexes jobs from third parties
  | 'SEARCH_ENGINE';    // used only to discover jobs

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  PRIMARY: 'Company site',
  ATS: 'ATS',
  SPECIALIST_BOARD: 'Specialist board',
  OFFICIAL: 'Official body',
  AGGREGATOR: 'Aggregator',
  SEARCH_ENGINE: 'Search engine',
};

/** Priority when the same job appears on several sources (lower wins). */
export const SOURCE_PRIORITY: Record<SourceType, number> = {
  PRIMARY: 1,
  ATS: 2,
  OFFICIAL: 3,
  SPECIALIST_BOARD: 4,
  AGGREGATOR: 5,
  SEARCH_ENGINE: 6,
};

/** Quality of the information a source typically provides (0-100). Not mixed with match score. */
export const SOURCE_QUALITY: Record<SourceType, number> = {
  PRIMARY: 100,
  OFFICIAL: 100,
  ATS: 95,
  SPECIALIST_BOARD: 80,
  AGGREGATOR: 60,
  SEARCH_ENGINE: 30,
};

export type SourceMethod =
  | 'API'
  | 'RSS'
  | 'STRUCTURED_DATA'
  | 'CAREER_PAGE'
  | 'CUSTOM_CONNECTOR'
  | 'MANUAL'
  | 'APPROVED_CRAWLER';

export interface SourceDef {
  id: string;
  name: string;
  domain: string;
  type: SourceType;
  country?: string;
  sector?: string;
  method: SourceMethod;
  endpoint?: string;
  frequency: string;
  priority: number;
  enabled: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DEMO';
  lastScan?: string;
  jobsIndexed: number;
  errors: number;
  notes?: string;
}

/* ---------------- Job ---------------- */

export type RemoteType =
  | 'on_site'
  | 'hybrid'
  | 'remote'              // remote, restriction unknown/unspecified
  | 'remote_worldwide'
  | 'remote_europe'
  | 'remote_eu'
  | 'remote_country'      // remote from a specific country
  | 'remote_timezone';    // remote within a timezone band

export const REMOTE_LABEL: Record<RemoteType, string> = {
  on_site: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
  remote_worldwide: 'Remote · worldwide',
  remote_europe: 'Remote · Europe',
  remote_eu: 'Remote · EU',
  remote_country: 'Remote · specific country',
  remote_timezone: 'Remote · timezone',
};

export type Seniority =
  | 'intern' | 'entry' | 'junior' | 'associate' | 'mid' | 'senior'
  | 'lead' | 'manager' | 'senior_manager' | 'head' | 'director' | 'vp' | 'c_level';

export const SENIORITY_ORDER: Seniority[] = [
  'intern', 'entry', 'junior', 'associate', 'mid', 'senior',
  'lead', 'manager', 'senior_manager', 'head', 'director', 'vp', 'c_level',
];

export const SENIORITY_LABEL: Record<Seniority, string> = {
  intern: 'Intern', entry: 'Entry', junior: 'Junior', associate: 'Associate',
  mid: 'Mid-level', senior: 'Senior', lead: 'Lead', manager: 'Manager',
  senior_manager: 'Senior Manager', head: 'Head', director: 'Director',
  vp: 'VP', c_level: 'C-Level',
};

export type ContractType =
  | 'permanent' | 'fixed_term' | 'temporary' | 'contractor'
  | 'consultancy' | 'freelance' | 'internship' | 'volunteer';

export const CONTRACT_LABEL: Record<ContractType, string> = {
  permanent: 'Permanent', fixed_term: 'Fixed term', temporary: 'Temporary',
  contractor: 'Contractor', consultancy: 'Consultancy', freelance: 'Freelance',
  internship: 'Internship', volunteer: 'Volunteer',
};

export type VisaSponsorship = 'confirmed' | 'possible' | 'not_mentioned';
export type DataConfidence = 'CONFIRMED' | 'INFERRED' | 'UNKNOWN';
export type JobStatus = 'ACTIVE' | 'MAY_BE_CLOSED' | 'CLOSED' | 'UNKNOWN';

export interface Job {
  id: string;
  externalId?: string;
  title: string;
  normalizedTitle: string;
  company: string;
  companyId?: string;
  companySize?: 'startup' | 'scaleup' | 'sme' | 'enterprise' | 'international_org' | 'ngo';
  city?: string;
  region?: string;
  country?: string;
  continent?: string;
  remoteType: RemoteType;
  eligibleRemoteCountries?: string[];
  remoteRestrictionNote?: string;
  employmentType: ContractType;
  seniority: Seniority;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string; // ISO 4217
  salaryPeriod?: 'annual' | 'monthly' | 'hourly';
  salaryConfidence: DataConfidence;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  languagesRequired: string[];
  languagesPreferred: string[];
  languageConfidence: DataConfidence;
  experienceMin?: number;
  experienceMax?: number;
  industry: string[];
  function: string[];
  visaSponsorship: VisaSponsorship;
  relocation: boolean;
  relocationConfidence: DataConfidence;
  expatriatePackage: boolean;
  postedAt: string; // ISO
  expiresAt?: string;
  discoveredAt: string;
  lastVerifiedAt: string;
  source: string;
  sourceType: SourceType;
  sourceUrl: string;
  originalSource?: string;
  originalUrl?: string;
  applyUrl: string;
  ats?: string;
  atsJobId?: string;
  status: JobStatus;
  qualityScore: number; // 0-100, information quality — never mixed with match score
  duplicateGroupId?: string;
}

/* ---------------- Matching ---------------- */

export interface ScoreBreakdown {
  title: number;      // 30
  location: number;   // 15
  skills: number;     // 20
  experience: number; // 10
  language: number;   // 10
  industry: number;   // 5
  seniority: number;  // 5
  workModel: number;  // 5
}

export const DEFAULT_WEIGHTS: ScoreBreakdown = {
  title: 30, location: 15, skills: 20, experience: 10,
  language: 10, industry: 5, seniority: 5, workModel: 5,
};

export type TraceStatus = 'pass' | 'warn' | 'fail';
export interface TraceCheck { label: string; status: TraceStatus; detail?: string }

export interface MatchTrace {
  retrievedFrom: string;
  normalizedTitle: string;
  matchedSynonyms: string[];
  checks: TraceCheck[];
  score: number;
}

export interface ScoredJob {
  job: Job;
  score: number; // 0-100
  breakdown: ScoreBreakdown;
  trace: MatchTrace;
  hardFailed: string[];
}

/* ---------------- Search profile ---------------- */

export type HardFilterKey =
  | 'title' | 'location' | 'remote' | 'salary' | 'language' | 'visa' | 'date' | 'seniority';

export const HARD_FILTER_LABEL: Record<HardFilterKey, string> = {
  title: 'Title',
  location: 'Location', remote: 'Remote', salary: 'Salary', language: 'Language',
  visa: 'Visa', date: 'Date posted', seniority: 'Seniority',
};

export interface LanguageRequirement {
  language: string;
  level: 'required' | 'preferred' | 'optional' | 'exclude_if_mandatory';
}

export type DatePostedFilter = 'any' | 'today' | '24h' | '3d' | '7d' | '14d' | '30d';
export type SortMode = 'best' | 'newest' | 'salary' | 'closing';

export interface SearchProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  // role
  titles: string[];
  exactTitles: string[];
  excludedTitles: string[];
  // keywords
  mustKeywords: string[];
  shouldKeywords: string[];
  mustNotKeywords: string[];
  // location
  locations: string[];
  excludedLocations: string[];
  // remote
  remote: RemoteType[];
  remoteFromCountry?: string;
  // taxonomy
  functions: string[];
  industries: string[];
  seniority: Seniority[];
  experienceMin?: number;
  experienceMax?: number;
  // languages
  languages: LanguageRequirement[];
  // contract
  employmentTypes: ContractType[];
  // salary
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryOnlyDisclosed: boolean;
  // mobility
  visaSponsorship?: boolean;
  relocation?: boolean;
  // companies
  companies: string[];
  excludedCompanies: string[];
  // sources
  sources: string[]; // source ids; empty = everywhere
  // date
  datePosted: DatePostedFilter;
  onlyNewSinceLastSearch: boolean;
  // ranking
  sort: SortMode;
  weights: ScoreBreakdown;
  minScore: number;
  hardFilters: HardFilterKey[];
}

export function createEmptyProfile(name = 'Untitled search'): SearchProfile {
  const now = new Date().toISOString();
  return {
    id: `sp_${Date.now().toString(36)}`,
    name, createdAt: now, updatedAt: now,
    titles: [], exactTitles: [], excludedTitles: [],
    mustKeywords: [], shouldKeywords: [], mustNotKeywords: [],
    locations: [], excludedLocations: [],
    remote: [], remoteFromCountry: undefined,
    functions: [], industries: [], seniority: [],
    experienceMin: undefined, experienceMax: undefined,
    languages: [],
    employmentTypes: [],
    salaryMin: undefined, salaryMax: undefined,
    salaryCurrency: 'EUR', salaryOnlyDisclosed: false,
    visaSponsorship: undefined, relocation: undefined,
    companies: [], excludedCompanies: [],
    sources: [],
    datePosted: 'any', onlyNewSinceLastSearch: false,
    sort: 'best', weights: { ...DEFAULT_WEIGHTS }, minScore: 0,
    hardFilters: ['language', 'location'],
  };
}

/* ---------------- Search execution ---------------- */

export interface PipelineStage { name: string; count: number; ms: number }

export interface SearchDiagnostics {
  filtersApplied: string[];
  sourcesSearched: string[];
  fetched: number;
  duplicates: number;
  hardFilterRejected: number;
  expired: number;
  candidates: number;
  highRelevance: number;
  stages: PipelineStage[];
}

export interface RelaxHint {
  id: string;
  label: string;
  description: string;
  gain: number;
  apply: Partial<SearchProfile>;
}

export interface SearchResult {
  jobs: ScoredJob[];
  total: number;
  newSinceLast: number;
  strongMatches: number;
  diagnostics: SearchDiagnostics;
  hints: RelaxHint[];
  isNew: boolean[]; // parallel to jobs
}

export interface DuplicateMember { job: Job; confidence: number }
export interface DuplicateGroup {
  id: string;
  canonical: Job;
  members: DuplicateMember[]; // includes canonical? no — only non-canonical
  allSources: string[];
}

/* ---------------- User data ---------------- */

export type ApplicationStage =
  | 'saved' | 'applied' | 'screening' | 'interview' | 'final'
  | 'offer' | 'rejected' | 'withdrawn' | 'not_interested';

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  saved: 'Saved', applied: 'Applied', screening: 'Screening',
  interview: 'Interview', final: 'Final interview', offer: 'Offer',
  rejected: 'Rejected', withdrawn: 'Withdrawn', not_interested: 'Not interested',
};

export interface SavedJobEntry {
  jobId: string;
  snapshot: Job;
  stage: ApplicationStage;
  savedAt: string;
  updatedAt: string;
  notes?: string;
}

export interface SavedSearchRun {
  searchId: string;
  runAt: string;
  total: number;
  newCount: number;
  jobIds: string[];
}

/* ---------------- Admin ---------------- */

export interface AdminConfig {
  weights: ScoreBreakdown;
  minScore: number;
  duplicateThreshold: number; // 0-100 confidence to merge
  maxJobAgeDays: number;
  sourcePriority: Record<SourceType, number>;
  defaultSort: SortMode;
  searchDepth: number;
}

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  weights: { ...DEFAULT_WEIGHTS },
  minScore: 0,
  duplicateThreshold: 72,
  maxJobAgeDays: 90,
  sourcePriority: { ...SOURCE_PRIORITY },
  defaultSort: 'best',
  searchDepth: 5000,
};
