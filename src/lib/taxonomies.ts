/* JOBRADAR — admin-editable taxonomies (seed values).
   In the real product these come from the admin panel; the seed is the default. */

export const TITLE_GROUPS: string[] = [
  // Finance & Accounting
  'Financial Controller', 'Finance Manager', 'FP&A Manager', 'Finance Business Partner',
  'Group Accountant', 'Financial Accountant', 'Management Accountant', 'Senior Accountant',
  'Treasury Manager', 'Treasury Analyst', 'Tax Manager', 'Tax Analyst',
  'Internal Auditor', 'External Auditor', 'Audit Manager', 'Compliance Officer',
  'Risk Manager', 'Credit Analyst', 'Payroll Specialist', 'CFO',
  // IT & Data
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer',
  'DevOps Engineer', 'Data Engineer', 'Data Scientist', 'Data Analyst',
  'Machine Learning Engineer', 'AI Engineer', 'Cloud Architect', 'Security Engineer',
  'QA Engineer', 'Product Manager', 'Engineering Manager', 'CTO',
  // Engineering
  'Mechanical Engineer', 'Electrical Engineer', 'Civil Engineer', 'Project Engineer',
  'Process Engineer', 'Quality Engineer',
  // NGO / International
  'Programme Officer', 'Project Manager', 'M&E Officer', 'Grants Manager',
  'Finance Officer', 'Logistics Coordinator', 'Humanitarian Affairs Officer',
  'Policy Analyst',
  // General
  'HR Manager', 'Recruiter', 'Marketing Manager', 'Sales Manager',
  'Operations Manager', 'Procurement Specialist', 'Customer Success Manager',
];

export const FUNCTIONS: string[] = [
  'Finance', 'Accounting', 'FP&A', 'Controlling', 'Treasury', 'Tax', 'Audit',
  'Compliance', 'Risk', 'Operations', 'Data', 'IT', 'Engineering', 'HR',
  'Procurement', 'Sales', 'Marketing', 'Customer Success', 'Legal', 'Programme Management',
];

export const INDUSTRIES: string[] = [
  'Financial Services', 'Banking', 'Fintech', 'Insurance', 'Manufacturing',
  'Automotive', 'Energy', 'Renewables', 'Infrastructure', 'Construction',
  'FMCG', 'Retail', 'Technology', 'SaaS', 'Agriculture', 'NGO',
  'International Organizations', 'Development Finance', 'Healthcare', 'Consulting',
];

export const SKILLS: string[] = [
  'IFRS', 'US GAAP', 'SAP', 'SAP S/4HANA', 'Oracle', 'NetSuite', 'Hyperion',
  'Power BI', 'Tableau', 'Excel', 'SQL', 'Python', 'R', 'VBA',
  'FP&A', 'Budgeting', 'Forecasting', 'Consolidation', 'Reporting',
  'Treasury', 'Cash Management', 'FX', 'Audit', 'SOX', 'Compliance', 'Risk Management',
  'React', 'TypeScript', 'Node.js', 'Java', 'Go', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'Terraform', 'Docker', 'Machine Learning', 'LLMs', 'Data Pipelines', 'dbt',
  'Stakeholder Management', 'Team Leadership', 'Big Four', 'M&E', 'Grant Management',
];

export const LANGUAGES: string[] = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Dutch', 'Arabic', 'Chinese', 'Japanese', 'Polish', 'Swedish',
];

export const CONTRACT_TYPES = [
  'permanent', 'fixed_term', 'temporary', 'contractor',
  'consultancy', 'freelance', 'internship', 'volunteer',
] as const;

export const WORK_MODELS = [
  'on_site', 'hybrid', 'remote', 'remote_worldwide',
  'remote_europe', 'remote_eu', 'remote_country', 'remote_timezone',
] as const;

export const COMPANY_SIZES = [
  'startup', 'scaleup', 'sme', 'enterprise', 'international_org', 'ngo',
] as const;

export const COMPANY_SIZE_LABEL: Record<string, string> = {
  startup: 'Startup', scaleup: 'Scale-up', sme: 'SME', enterprise: 'Enterprise',
  international_org: 'International organization', ngo: 'NGO',
};
