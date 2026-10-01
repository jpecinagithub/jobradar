/* JOBRADAR — occupation semantic dictionary (admin-editable seed).
   Synonyms/related broaden a title match; `excluded` meanings must NEVER match. */

export interface OccupationEntry {
  canonical: string;
  synonyms: string[];   // safe equivalences
  related: string[];    // close, weaker signal
  broader?: string;
  narrower: string[];
  excluded: string[];   // must never be treated as the same occupation
}

export const OCCUPATIONS: OccupationEntry[] = [
  {
    canonical: 'Financial Controller',
    synonyms: ['Finance Controller', 'Group Controller', 'Regional Controller', 'Plant Controller', 'Country Controller', 'Financial Control Manager'],
    related: ['Head of Controlling', 'Controlling Manager'],
    narrower: ['Assistant Controller'],
    excluded: ['Credit Controller', 'Document Controller', 'Project Controller', 'Traffic Controller', 'Stock Controller', 'Inventory Controller'],
  },
  {
    canonical: 'Finance Manager',
    synonyms: ['Manager Finance', 'Finance Lead'],
    related: ['Financial Controller', 'FP&A Manager', 'Finance Business Partner'],
    narrower: ['Assistant Finance Manager'],
    excluded: ['CFO', 'Finance Director'],
  },
  {
    canonical: 'FP&A Manager',
    synonyms: ['Financial Planning and Analysis Manager', 'Planning Manager Finance', 'FP&A Lead'],
    related: ['Finance Business Partner', 'Finance Manager'],
    narrower: ['FP&A Analyst', 'Senior FP&A Analyst'],
    excluded: [],
  },
  {
    canonical: 'Finance Business Partner',
    synonyms: ['Business Partner Finance', 'Finance BP'],
    related: ['FP&A Manager', 'Finance Manager'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'Accountant',
    synonyms: ['Staff Accountant', 'General Accountant'],
    related: ['Financial Accountant', 'Management Accountant'],
    narrower: ['Junior Accountant', 'Assistant Accountant'],
    excluded: [],
  },
  {
    canonical: 'Financial Accountant',
    synonyms: ['Financial Accounting Specialist'],
    related: ['Group Accountant', 'Management Accountant'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'Management Accountant',
    synonyms: ['Cost Accountant', 'Management Accounting Specialist'],
    related: ['Financial Accountant', 'FP&A Analyst'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'Treasury Manager',
    synonyms: ['Head of Treasury', 'Corporate Treasury Manager'],
    related: ['Treasury Analyst', 'Cash Manager'],
    narrower: ['Treasury Analyst', 'Treasury Specialist'],
    excluded: [],
  },
  {
    canonical: 'Tax Manager',
    synonyms: ['Corporate Tax Manager', 'Head of Tax'],
    related: ['Tax Analyst', 'Transfer Pricing Manager'],
    narrower: ['Tax Analyst', 'Tax Specialist'],
    excluded: [],
  },
  {
    canonical: 'Internal Auditor',
    synonyms: ['Internal Audit Specialist'],
    related: ['External Auditor', 'Audit Manager', 'Compliance Officer'],
    narrower: ['Audit Assistant'],
    excluded: [],
  },
  {
    canonical: 'Frontend Developer',
    synonyms: ['Front-End Developer', 'Front End Engineer', 'UI Developer'],
    related: ['Full Stack Developer', 'Web Developer'],
    narrower: ['Junior Frontend Developer'],
    excluded: [],
  },
  {
    canonical: 'Backend Developer',
    synonyms: ['Back-End Developer', 'Back End Engineer', 'Server-Side Developer'],
    related: ['Full Stack Developer', 'DevOps Engineer'],
    narrower: ['Junior Backend Developer'],
    excluded: [],
  },
  {
    canonical: 'Full Stack Developer',
    synonyms: ['Full-Stack Developer', 'Fullstack Engineer'],
    related: ['Frontend Developer', 'Backend Developer'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'Data Engineer',
    synonyms: ['Big Data Engineer', 'Analytics Engineer'],
    related: ['Data Scientist', 'Backend Developer'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'Data Scientist',
    synonyms: ['Machine Learning Scientist'],
    related: ['Data Engineer', 'Machine Learning Engineer', 'Data Analyst'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'AI Engineer',
    synonyms: ['Artificial Intelligence Engineer', 'GenAI Engineer', 'LLM Engineer'],
    related: ['Machine Learning Engineer', 'Backend Developer'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'DevOps Engineer',
    synonyms: ['DevOps Specialist', 'Platform Engineer', 'SRE', 'Site Reliability Engineer'],
    related: ['Cloud Architect', 'Backend Developer'],
    narrower: [],
    excluded: [],
  },
  {
    canonical: 'Product Manager',
    synonyms: ['Product Owner', 'Technical Product Manager'],
    related: ['Project Manager', 'Engineering Manager'],
    narrower: ['Associate Product Manager'],
    excluded: ['Project Manager'],
  },
  {
    canonical: 'Project Manager',
    synonyms: ['PM', 'Delivery Manager'],
    related: ['Programme Manager', 'Scrum Master'],
    narrower: ['Assistant Project Manager'],
    excluded: ['Product Manager'],
  },
  {
    canonical: 'Programme Officer',
    synonyms: ['Program Officer', 'Programme Manager'],
    related: ['Project Officer', 'Grants Manager'],
    narrower: ['Assistant Programme Officer'],
    excluded: [],
  },
  {
    canonical: 'M&E Officer',
    synonyms: ['Monitoring and Evaluation Officer', 'MEAL Officer'],
    related: ['Programme Officer', 'Data Analyst'],
    narrower: [],
    excluded: [],
  },
];

const byCanonical = new Map<string, OccupationEntry>();
for (const o of OCCUPATIONS) byCanonical.set(o.canonical.toLowerCase(), o);

export function findOccupation(title: string): OccupationEntry | undefined {
  const t = title.toLowerCase().trim();
  if (byCanonical.has(t)) return byCanonical.get(t);
  for (const o of OCCUPATIONS) {
    if (o.synonyms.some((s) => s.toLowerCase() === t)) return o;
  }
  return undefined;
}

/** All safe title variants for a canonical title (canonical + synonyms + narrower). */
export function titleVariants(title: string): string[] {
  const entry = findOccupation(title);
  if (!entry) return [title];
  return [entry.canonical, ...entry.synonyms, ...entry.narrower];
}

/** Related (weaker) variants. */
export function titleRelated(title: string): string[] {
  const entry = findOccupation(title);
  return entry ? entry.related : [];
}

/**
 * Returns true when `candidate` is a semantically EXCLUDED meaning of `title`
 * (e.g. 'Credit Controller' is excluded for 'Financial Controller').
 */
export function isExcludedMeaning(title: string, candidate: string): boolean {
  const entry = findOccupation(title);
  if (!entry || !entry.excluded.length) return false;
  const c = candidate.toLowerCase();
  return entry.excluded.some((e) => c.includes(e.toLowerCase()) || e.toLowerCase().includes(c));
}
