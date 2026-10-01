import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Radar, Search, BookmarkCheck, KanbanSquare, LayoutDashboard, FlaskConical } from 'lucide-react';
import { BRAND } from '../../lib/types';
import { cn } from '../ui/cn';

const links = [
  { to: '/search', label: 'Search Jobs', icon: Search },
  { to: '/saved-searches', label: 'Saved Searches', icon: BookmarkCheck },
  { to: '/saved', label: 'Saved Jobs', icon: BookmarkCheck },
  { to: '/applications', label: 'Applications', icon: KanbanSquare },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard },
];

export function Navbar() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-brand-500">
            <Radar size={20} strokeWidth={2.2} />
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-bold tracking-tight text-ink-900">{BRAND.name}</span>
            <span className="block text-[11px] text-ink-400">{BRAND.claim}</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                  isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
                )
              }
            >
              <l.icon size={15} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate('/search')}
            className="hidden items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-[13.5px] font-medium text-white transition-all hover:bg-ink-800 active:scale-[0.98] sm:inline-flex"
          >
            <Search size={15} />
            New search
          </button>
          {/* mobile nav */}
          <div className="flex items-center gap-1 lg:hidden">
            {links.slice(0, 4).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                aria-label={l.label}
                className={({ isActive }) =>
                  cn('rounded-lg p-2', isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500')
                }
              >
                <l.icon size={18} />
              </NavLink>
            ))}
            <NavLink to="/admin" aria-label="Admin" className="rounded-lg p-2 text-ink-500">
              <FlaskConical size={18} />
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
}
