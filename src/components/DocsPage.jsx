import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const roleDocs = [
  {
    role: 'USER',
    access: 'Own devices and own registration context',
    actions: [
      'View assigned device health and tamper alerts',
      'Register device profile and ownership metadata',
      'Track personal compliance status',
    ],
  },
  {
    role: 'ADMIN',
    access: 'District operational management',
    actions: [
      'Approve and reject pending user registrations',
      'Monitor district-level anomalies and activity',
      'Manage operational escalations and response paths',
    ],
  },
  {
    role: 'LM_OFFICER',
    access: 'Regulatory and enforcement visibility',
    actions: [
      'Inspect tamper events with legal metrology context',
      'Review compliance boundaries by assigned zones',
      'Use evidence streams for enforcement actions',
    ],
  },
  {
    role: 'DISTRICT_SUPER_ADMIN',
    access: 'Highest district authority and governance',
    actions: [
      'Perform policy-level interventions',
      'Unlock and control elevated device workflows',
      'Drive cross-role governance decisions',
    ],
  },
  {
    role: 'MANUFACTURER',
    access: 'Fleet manufacturing and model intelligence',
    actions: [
      'Track deployed devices by model and status',
      'Analyze tamper patterns by manufacturing batches',
      'Coordinate service and lifecycle interventions',
    ],
  },
];

export default function DocsPage() {
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
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <header
        className={`sticky top-0 z-10 border-b backdrop-blur-xl ${
          isDark
            ? 'border-white/10 bg-slate-900/90'
            : 'border-slate-900/10 bg-white/90'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1
            className={`text-lg font-black ${
              isDark ? 'text-cyan-300' : 'text-cyan-700'
            }`}
          >
            Documentation
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <Link to="/" className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">
              Home
            </Link>
            <Link to="/login" className="rounded-lg bg-cyan-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-cyan-400">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section
          className={`rounded-3xl border p-6 shadow-xl backdrop-blur-xl ${
            isDark ? 'border-white/10 bg-white/5' : 'border-slate-900/10 bg-white'
          }`}
        >
          <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            System Overview
          </h2>
          <p className={`mt-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            TRUSTSCALE combines MQTT-based IoT telemetry, Firebase authentication,
            Firestore profile control, and role-specific dashboards to detect
            tampering events and route them to the right responsibility layer.
            This page explains product architecture with practical examples.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoChip
              title="Ingestion"
              body="ESP32/IoT sensors -> MQTT topics -> live dashboard state"
              isDark={isDark}
            />
            <InfoChip
              title="Identity"
              body="Firebase Auth + users/{uid} profile governs role behavior"
              isDark={isDark}
            />
            <InfoChip
              title="Operations"
              body="Role-based flows for monitoring, approvals, and compliance"
              isDark={isDark}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <DocCard
            title="Problem We Are Solving"
            items={[
              'Measurement devices can be physically or magnetically tampered without immediate visibility.',
              'Manual inspection cycles are slow and often post-incident.',
              'Evidence and action ownership are fragmented across users, officers, and admins.',
            ]}
            isDark={isDark}
          />
          <DocCard
            title="How We Solve It"
            items={[
              'Realtime ingestion from IoT sensors through MQTT topics and hook-level normalization.',
              'Role-gated dashboards route alert context to the correct authority chain.',
              'Firestore/RTDB data model keeps operational state, approvals, and auditable actions aligned.',
            ]}
            isDark={isDark}
          />
        </section>

        <section className="mt-8">
          <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Role Pages
          </h3>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Open dedicated pages for deep, role-specific workflows and architecture fit.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roleDocs.map((entry) => (
              <Link
                key={entry.role}
                to={`/docs/roles/${entry.role.toLowerCase()}`}
                className={`rounded-xl border p-4 transition ${
                  isDark
                    ? 'border-cyan-300/20 bg-cyan-500/10 hover:bg-cyan-500/20'
                    : 'border-cyan-700/20 bg-cyan-500/10 hover:bg-cyan-500/20'
                }`}
              >
                <p className={`text-sm font-black ${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
                  {entry.role}
                </p>
                <p className={`mt-1 text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Detailed role page
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <DocCard
            title="Frontend Architecture"
            items={[
              'Routing: BrowserRouter + ProtectedRoute for access gates',
              'State: AuthContext, ThemeContext, SearchFilterContext',
              'Live data: useMqttTamper and useMqttLDR hooks',
            ]}
            isDark={isDark}
          />
          <DocCard
            title="Backend Integration"
            items={[
              'Auth: Firebase Email/Password with email verification flow',
              'DB: Firestore users, device_registrations, audit_logs',
              'RT stream: Realtime Database tamper_logs consumption',
            ]}
            isDark={isDark}
          />
        </section>

        <section className="mt-8">
          <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Architecture Flow
          </h3>
          <div
            className={`mt-4 rounded-2xl border p-4 font-mono text-xs leading-relaxed ${
              isDark
                ? 'border-cyan-300/20 bg-slate-950 text-slate-200'
                : 'border-cyan-700/20 bg-slate-100 text-slate-800'
            }`}
          >
            Device Sensors -&gt; MQTT Topics -&gt; Hooks (useMqttTamper/useMqttLDR)
            -&gt; Role Filters -&gt; Dashboard Components -&gt; Alerts/Logs -&gt;
            Firestore/Realtime Database
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <DocCard
            title="Architecture Example: Tamper Incident"
            items={[
              'Sensor breach signal is published to MQTT tamper topic.',
              'useMqttTamper normalizes payload and tags severity.',
              'Role filter sends USER local alert, ADMIN escalation card, LM_OFFICER compliance flag.',
              'Event snapshot is persisted for audit in Firestore/RTDB.',
            ]}
            isDark={isDark}
          />
          <DocCard
            title="Architecture Example: Device Registration"
            items={[
              'USER submits registration with ownership metadata.',
              'Firestore stores pending state and ownership context.',
              'ADMIN approval workflow updates registration status.',
              'DISTRICT_SUPER_ADMIN can override blocked states when policy allows.',
            ]}
            isDark={isDark}
          />
        </section>

        <section className="mt-8">
          <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Code Reference Snippets
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <CodePanel
              title="Role Normalization"
              code={`const normalizeRole = (role) =>
  role ? String(role).toUpperCase() : null;`}
              isDark={isDark}
            />
            <CodePanel
              title="Protected Route Gate"
              code={`if (!currentUser) {
  return <Navigate to="/login" replace />;
}

if (allowedRoles && !allowedRoles.includes(userRole)) {
  return <Navigate to="/dashboard" replace />;
}`}
              isDark={isDark}
            />
            <CodePanel
              title="Firebase Login Profile Read"
              code={`const userDoc = await getDoc(doc(db, 'users', uid));
if (userDoc.exists()) {
  setCurrentUser({ ...userDoc.data(), uid });
}`}
              isDark={isDark}
            />
            <CodePanel
              title="Theme Swift Logic"
              code={`const { theme, setTheme } = useTheme();
const isDark = theme === 'dark';

<button onClick={() => setTheme('light')}>Light</button>
<button onClick={() => setTheme('dark')}>Dark</button>
<button onClick={() => setTheme('system')}>System</button>`}
              isDark={isDark}
            />
          </div>
        </section>

        <section className="mt-8">
          <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Role-Based Detailed Explanation
          </h3>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Each role has distinct access boundaries and operational duties.
            Open each role page for full architecture examples and mapped workflows.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {roleDocs.map((entry) => (
              <article
                key={entry.role}
                className={`rounded-2xl border p-5 shadow-lg ${
                  isDark
                    ? 'border-white/10 bg-slate-800/60'
                    : 'border-slate-900/10 bg-white'
                }`}
              >
                <p
                  className={`text-sm font-black tracking-wide ${
                    isDark ? 'text-cyan-200' : 'text-cyan-700'
                  }`}
                >
                  {entry.role}
                </p>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Access:
                  </span>{' '}
                  {entry.access}
                </p>
                <ul
                  className={`mt-3 list-disc space-y-1 pl-5 text-sm ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {entry.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                <div
                  className={`mt-4 rounded-xl border p-3 text-xs ${
                    isDark
                      ? 'border-cyan-300/20 bg-cyan-500/10 text-slate-200'
                      : 'border-cyan-700/20 bg-cyan-500/10 text-slate-800'
                  }`}
                >
                  Suggested schema source: rolesSchema.js -&gt; ROLE_SCHEMAS.{entry.role}
                </div>
              </article>
            ))}
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

function DocCard({ title, items, isDark }) {
  return (
    <article
      className={`rounded-2xl border p-5 ${
        isDark ? 'border-white/10 bg-slate-800/50' : 'border-slate-900/10 bg-white'
      }`}
    >
      <h4 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <ul className={`mt-3 list-disc space-y-1 pl-5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function CodePanel({ title, code, isDark }) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        isDark ? 'border-white/10 bg-slate-800/60' : 'border-slate-900/10 bg-white'
      }`}
    >
      <h4 className={`mb-2 text-sm font-black ${isDark ? 'text-cyan-200' : 'text-cyan-700'}`}>{title}</h4>
      <pre
        className={`overflow-x-auto rounded-xl p-3 text-xs leading-relaxed ${
          isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-800'
        }`}
      >
        <code>{code}</code>
      </pre>
    </article>
  );
}

function InfoChip({ title, body, isDark }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        isDark
          ? 'border-cyan-300/20 bg-cyan-500/10'
          : 'border-cyan-700/20 bg-cyan-500/10'
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-wider ${
          isDark ? 'text-cyan-200' : 'text-cyan-800'
        }`}
      >
        {title}
      </p>
      <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        {body}
      </p>
    </div>
  );
}
