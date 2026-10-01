import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Database, SlidersHorizontal, Tags, BookOpen, Briefcase,
  Copy, Cpu, BarChart3, Settings,
} from 'lucide-react';
import { cn } from '../../components/ui/cn';
import { BRAND } from '../../lib/types';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/sources', label: 'Sources', icon: Database },
  { to: '/admin/filters', label: 'Search Filters', icon: SlidersHorizontal },
  { to: '/admin/taxonomies', label: 'Taxonomies', icon: Tags },
  { to: '/admin/synonyms', label: 'Synonyms', icon: BookOpen },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/duplicates', label: 'Duplicates', icon: Copy },
  { to: '/admin/engine', label: 'Search Engine', icon: Cpu },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/system', label: 'System', icon: Settings },
];

function NavItems({ mobile }: { mobile?: boolean }) {
  return (
    <>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              mobile
                ? 'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors'
                : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? mobile
                  ? 'bg-white/10 text-white'
                  : 'bg-white/10 text-white'
                : 'text-ink-300 hover:bg-white/5 hover:text-white',
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export default function AdminLayout() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Administration</h1>
        </div>
        <span className="hidden text-xs text-ink-500 sm:block">{BRAND.name} admin console</span>
      </div>

      {/* Mobile nav: horizontal scroll */}
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-ink-950 p-2 lg:hidden">
        <NavItems mobile />
      </nav>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-4 space-y-1 rounded-2xl bg-ink-950 p-3">
            <NavItems />
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
