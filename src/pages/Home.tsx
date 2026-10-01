import { useNavigate } from 'react-router-dom';
import { Radar, SlidersHorizontal, BellRing, ExternalLink, ShieldCheck, BadgeCheck, Files, Globe2 } from 'lucide-react';
import { BRAND, SOURCE_TYPE_LABEL, createEmptyProfile, type SourceType, type SearchProfile } from '../lib/types';
import { NaturalSearchBox } from '../components/search/NaturalSearchBox';
import { useSearchStore } from '../store/useSearchStore';
import { useAdminStore } from '../store/useAdminStore';
import { Card, CardContent } from '../components/ui/card';

const PRESETS: { label: string; build: () => SearchProfile }[] = [
  {
    label: 'Finance',
    build: () => {
      const p = createEmptyProfile('Finance roles');
      p.titles = ['Financial Controller', 'Finance Manager'];
      p.functions = ['Finance'];
      p.locations = ['Europe'];
      return p;
    },
  },
  {
    label: 'Technology',
    build: () => {
      const p = createEmptyProfile('Technology roles');
      p.functions = ['IT'];
      p.industries = ['Technology'];
      return p;
    },
  },
  {
    label: 'Remote',
    build: () => {
      const p = createEmptyProfile('Remote roles');
      p.remote = ['remote_worldwide'];
      return p;
    },
  },
  {
    label: 'International Organizations',
    build: () => {
      const p = createEmptyProfile('International Organizations');
      p.industries = ['International Organizations'];
      p.languages = [{ language: 'English', level: 'required' }];
      return p;
    },
  },
  {
    label: 'NGO',
    build: () => {
      const p = createEmptyProfile('NGO roles');
      p.industries = ['NGO'];
      p.locations = ['Europe'];
      return p;
    },
  },
  {
    label: 'Engineering',
    build: () => {
      const p = createEmptyProfile('Engineering roles');
      p.functions = ['Engineering'];
      return p;
    },
  },
];

const SOURCE_GROUPS: { title: string; types: SourceType[] }[] = [
  { title: 'ATS platforms', types: ['ATS'] },
  { title: 'Company sites', types: ['PRIMARY'] },
  { title: 'Official boards', types: ['OFFICIAL'] },
  { title: 'Specialist boards', types: ['SPECIALIST_BOARD'] },
  { title: 'Aggregators', types: ['AGGREGATOR'] },
];

const STEPS = [
  { icon: Globe2, title: 'Describe', text: 'Tell us what you are looking for in plain words — or build it visually.' },
  { icon: SlidersHorizontal, title: 'Fine-tune', text: 'Hard filters eliminate. Soft criteria boost the match score.' },
  { icon: Radar, title: 'Search everywhere', text: 'One query across ATS platforms, company sites and official boards — deduplicated.' },
  { icon: BellRing, title: 'Track & apply', text: 'Save searches, get only new jobs, apply directly on the original website.' },
];

export default function Home() {
  const navigate = useNavigate();
  const setDraft = useSearchStore((s) => s.setDraft);
  const run = useSearchStore((s) => s.run);
  const sources = useAdminStore((s) => s.sources);

  const runPreset = (build: () => SearchProfile) => {
    const p = build();
    setDraft(p);
    navigate('/search');
    run(p);
  };

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(600px 300px at 20% -40px, rgba(8,145,178,0.10), transparent), radial-gradient(500px 280px at 85% 0px, rgba(139,92,246,0.07), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            {BRAND.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-500">
            {BRAND.heroSubtitle}
          </p>
          <div className="mt-8">
            <NaturalSearchBox />
          </div>

          <div className="mt-8">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Popular searches
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => runPreset(p.build)}
                  className="rounded-full border border-ink-200 bg-white px-4 py-2 text-[13.5px] font-medium text-ink-700 transition-all hover:-translate-y-0.5 hover:border-brand-600/40 hover:text-brand-700 hover:shadow-md"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-ink-100 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6">
          {[
            { icon: ShieldCheck, text: 'No ads' },
            { icon: BadgeCheck, text: 'No sponsored results' },
            { icon: Files, text: 'No duplicates' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center justify-center gap-2.5 text-[14px] font-medium text-ink-700">
              <Icon size={18} className="text-brand-600" />
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* SOURCES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Search across multiple sources
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-ink-500">
          The index prioritizes the original posting — company sites and ATS platforms first, aggregators last.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SOURCE_GROUPS.map((g) => {
            const list = sources.filter((s) => g.types.includes(s.type) && s.enabled);
            if (list.length === 0) return null;
            return (
              <Card key={g.title} className="fade-up">
                <CardContent className="p-5">
                  <h3 className="text-[15px] font-semibold text-ink-900">{g.title}</h3>
                  <ul className="mt-3 space-y-2">
                    {list.slice(0, 6).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 text-[13.5px]">
                        <span className="font-medium text-ink-700">{s.name}</span>
                        <span className="shrink-0 text-[11.5px] text-ink-400">
                          {SOURCE_TYPE_LABEL[s.type]} · {s.method.replace(/_/g, ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {list.length > 6 && (
                    <p className="mt-2 text-[12.5px] text-ink-400">+{list.length - 6} more</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-ink-50/70 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Card key={title} className="fade-up">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon size={20} />
                  </div>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-[16px] font-semibold text-ink-900">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <button
              onClick={() => navigate('/search')}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-[15px] font-semibold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700"
            >
              Start searching
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
