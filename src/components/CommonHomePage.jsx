import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function CommonHomePage() {
  const { theme, setTheme } = useTheme();
  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const resolveTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme);
      }
    };

    resolveTheme();
    mediaQuery.addEventListener('change', resolveTheme);
    return () => mediaQuery.removeEventListener('change', resolveTheme);
  }, [theme]);

  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={`min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl ${
            isDark ? 'bg-cyan-500/20' : 'bg-cyan-500/25'
          }`}
        />
        <div
          className={`absolute top-1/3 -right-24 h-80 w-80 rounded-full blur-3xl ${
            isDark ? 'bg-amber-500/15' : 'bg-amber-500/20'
          }`}
        />
        <div
          className={`absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl ${
            isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/15'
          }`}
        />
      </div>

      <header
        className={`relative z-10 border-b backdrop-blur-xl ${
          isDark
            ? 'border-white/10 bg-slate-950/70'
            : 'border-slate-900/10 bg-white/70'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1
            className={`text-lg font-black tracking-wide ${
              isDark ? 'text-cyan-300' : 'text-cyan-700'
            }`}
          >
            TRUSTSCALE
          </h1>
          <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-3">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <Link
              to="/docs"
              className={`rounded-xl border px-4 py-2 transition ${
                isDark
                  ? 'border-cyan-300/40 text-cyan-200 hover:bg-cyan-500/10'
                  : 'border-cyan-700/30 text-cyan-700 hover:bg-cyan-500/10'
              }`}
            >
              Docs
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-slate-950 transition hover:bg-cyan-400"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p
              className={`mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                isDark
                  ? 'border-amber-300/40 bg-amber-500/10 text-amber-200'
                  : 'border-amber-700/30 bg-amber-500/15 text-amber-800'
              }`}
            >
              IoT Tamper Intelligence Platform
            </p>
            <h2
              className={`text-4xl font-black leading-tight sm:text-5xl ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              One Home for Monitoring, Compliance, and Role-Based Control.
            </h2>
            <p
              className={`mt-5 max-w-xl text-base sm:text-lg ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Detect tampering in real time, route alerts to the right authority,
              and keep immutable, role-specific operational context for USER,
              ADMIN, LM_OFFICER, DISTRICT_SUPER_ADMIN, and MANUFACTURER.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02]"
              >
                Open Login
              </Link>
              <Link
                to="/register"
                className={`rounded-xl border px-5 py-3 text-sm font-bold transition ${
                  isDark
                    ? 'border-white/20 text-slate-100 hover:bg-white/10'
                    : 'border-slate-700/20 text-slate-800 hover:bg-slate-900/5'
                }`}
              >
                New User Registration
              </Link>
              <Link
                to="/docs"
                className={`rounded-xl border px-5 py-3 text-sm font-bold transition ${
                  isDark
                    ? 'border-cyan-300/40 text-cyan-200 hover:bg-cyan-500/10'
                    : 'border-cyan-700/30 text-cyan-700 hover:bg-cyan-500/10'
                }`}
              >
                Explore Detailed Docs
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatCard label="Realtime Ingestion" value="MQTT Live" isDark={isDark} />
              <StatCard label="Access Control" value="RBAC x 5 Roles" isDark={isDark} />
              <StatCard label="Auditability" value="Tamper Trace" isDark={isDark} />
            </div>
          </div>

          <div
            className={`rounded-3xl border p-6 backdrop-blur-xl shadow-2xl ${
              isDark
                ? 'border-white/15 bg-white/5'
                : 'border-slate-900/10 bg-white/70'
            }`}
          >
            <h3
              className={`mb-4 text-xl font-black ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Product Capability Surface
            </h3>
            <p
              className={`mb-4 text-sm ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Unified tamper intelligence operations with role boundaries,
              realtime signal processing, and compliance-first visibility.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <RoleTile
                title="USER"
                body="Device owner view, alerts, own registrations."
                color="emerald"
                isDark={isDark}
              />
              <RoleTile
                title="ADMIN"
                body="Approvals, district moderation, operations."
                color="cyan"
                isDark={isDark}
              />
              <RoleTile
                title="LM_OFFICER"
                body="Regulatory inspection and oversight workflows."
                color="amber"
                isDark={isDark}
              />
              <RoleTile
                title="DISTRICT_SUPER_ADMIN"
                body="Policy enforcement and cross-district authority."
                color="rose"
                isDark={isDark}
              />
              <RoleTile
                title="MANUFACTURER"
                body="Fleet lifecycle, status, and model-level telemetry."
                color="violet"
                isDark={isDark}
              />
            </div>
            <p
              className={`mt-4 text-xs ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Full responsibilities, architecture, and flows are available in the
              docs section.
            </p>
          </div>
        </section>

        <section
          className={`mt-12 rounded-3xl border p-6 ${
            isDark
              ? 'border-white/10 bg-white/5'
              : 'border-slate-900/10 bg-white/80'
          }`}
        >
          <h3
            className={`text-2xl font-black ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Product Architecture Highlights
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Pill
              title="Role Segmentation"
              body="Distinct responsibility domains with consistent access boundaries and route control."
              isDark={isDark}
            />
            <Pill
              title="Realtime Telemetry Core"
              body="Always-on MQTT streams transformed into actionable operational signals."
              isDark={isDark}
            />
            <Pill
              title="Compliance Workflow Engine"
              body="Approvals, inspections, and tamper events connected to governance actions."
              isDark={isDark}
            />
          </div>
        </section>

        <footer className="mt-10 text-center text-sm">
          <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            Product contact: shanthosh.krishnan@outlook.com
          </p>
        </footer>
      </main>
    </div>
  );
}

function ThemeToggle({ theme, setTheme }) {
  const options = ['light', 'dark', 'system'];
  const rootIsLight = theme === 'light';

  return (
    <div className="hidden items-center rounded-xl border border-slate-400/25 p-1 sm:flex">
      {options.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition ${
            theme === value
              ? 'bg-cyan-500 text-slate-950'
              : rootIsLight
              ? 'text-slate-700 hover:bg-slate-900/10'
              : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, isDark }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        isDark
          ? 'border-white/10 bg-slate-900/60'
          : 'border-slate-900/10 bg-white'
      }`}
    >
      <p className={`text-[11px] uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`mt-1 text-sm font-black ${isDark ? 'text-cyan-200' : 'text-cyan-700'}`}>
        {value}
      </p>
    </div>
  );
}

function Pill({ title, body, isDark }) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark
          ? 'border-cyan-300/20 bg-cyan-500/10'
          : 'border-cyan-700/20 bg-cyan-500/10'
      }`}
    >
      <h4 className={`text-sm font-black ${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
        {title}
      </h4>
      <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        {body}
      </p>
    </article>
  );
}

function RoleTile({ title, body, color, isDark }) {
  const toneDark = {
    emerald: 'border-emerald-300/40 bg-emerald-500/10 text-emerald-100',
    cyan: 'border-cyan-300/40 bg-cyan-500/10 text-cyan-100',
    amber: 'border-amber-300/40 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-300/40 bg-rose-500/10 text-rose-100',
    violet: 'border-violet-300/40 bg-violet-500/10 text-violet-100',
  };

  const toneLight = {
    emerald: 'border-emerald-700/20 bg-emerald-500/15 text-emerald-900',
    cyan: 'border-cyan-700/20 bg-cyan-500/15 text-cyan-900',
    amber: 'border-amber-700/20 bg-amber-500/15 text-amber-900',
    rose: 'border-rose-700/20 bg-rose-500/15 text-rose-900',
    violet: 'border-violet-700/20 bg-violet-500/15 text-violet-900',
  };

  return (
    <div
      className={`rounded-2xl border p-3 ${
        isDark ? toneDark[color] : toneLight[color]
      }`}
    >
      <p className="text-xs font-black tracking-wide">{title}</p>
      <p className="mt-1 text-xs leading-relaxed opacity-90">{body}</p>
    </div>
  );
}
