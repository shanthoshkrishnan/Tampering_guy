import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const roleContent = {
  user: {
    title: 'USER',
    purpose: 'Own-device monitoring and registration workflows.',
    keyWorkflows: [
      'Login and verify profile state for own access context.',
      'Register device details and map ownership metadata.',
      'Track device tamper alerts and status transitions.',
    ],
    architectureFit:
      'USER interacts at the edge of the system: input actions, registration requests, and direct alert consumption.',
    architectureExample:
      'When a tamper event is detected, USER receives device-specific alert cards and can confirm field status updates, which are then logged for admin review.',
    scenarioFlow:
      'Sensor Event -&gt; MQTT -&gt; Hook Processing -&gt; USER Dashboard Alert -&gt; Acknowledgement -&gt; Firestore Log',
    codeRef: `// user gate (conceptual)
if (currentRole === 'USER') {
  showOwnDevicesOnly();
}`,
  },
  admin: {
    title: 'ADMIN',
    purpose: 'District operations and approval governance.',
    keyWorkflows: [
      'Review pending user approvals from Firestore.',
      'Approve/reject requests and log outcomes.',
      'Monitor operational issues across managed scope.',
    ],
    architectureFit:
      'ADMIN sits between user operations and district policy with moderation authority.',
    architectureExample:
      'A new device registration enters pending state; ADMIN verifies profile integrity and approves or rejects, updating downstream dashboard visibility.',
    scenarioFlow:
      'Registration Request -&gt; Firestore Pending Queue -&gt; ADMIN Review -&gt; Status Update -&gt; User Notification',
    codeRef: `const q = query(
  collection(db, 'users'),
  where('status', '==', 'pending')
);`,
  },
  lm_officer: {
    title: 'LM_OFFICER',
    purpose: 'Regulatory inspection and compliance monitoring.',
    keyWorkflows: [
      'Observe tamper events and forensic indicators.',
      'Track zone-level compliance signal quality.',
      'Support legal metrology evidence review.',
    ],
    architectureFit:
      'LM_OFFICER is the compliance control point for investigative actions.',
    architectureExample:
      'LM_OFFICER reviews high-risk tamper clusters and validates legal metrology implications before formal enforcement steps.',
    scenarioFlow:
      'Tamper Burst -&gt; Severity Aggregation -&gt; LM_OFFICER Review -&gt; Compliance Note -&gt; Escalation Record',
    codeRef: `// officer analysis entry
const isOfficer = role === 'LM_OFFICER';`,
  },
  district_super_admin: {
    title: 'DISTRICT_SUPER_ADMIN',
    purpose: 'Top district authority with escalated controls.',
    keyWorkflows: [
      'Intervene in high-risk workflows and unlock paths.',
      'Coordinate cross-role decisions.',
      'Enforce district-level governance policy.',
    ],
    architectureFit:
      'DISTRICT_SUPER_ADMIN resolves high-severity scenarios and policy exceptions.',
    architectureExample:
      'If cross-role conflict appears during incident handling, DISTRICT_SUPER_ADMIN overrides constraints and applies district policy decisions.',
    scenarioFlow:
      'Critical Incident -&gt; Multi-Role Conflict -&gt; Super Admin Override -&gt; Policy Enforcement -&gt; Final Audit Trail',
    codeRef: `const isDistrictSuperAdmin =
  currentRole === 'DISTRICT_SUPER_ADMIN';`,
  },
  manufacturer: {
    title: 'MANUFACTURER',
    purpose: 'Fleet/model lifecycle and deployment intelligence.',
    keyWorkflows: [
      'Track model-specific device behavior in field.',
      'Analyze batch trends and tamper signatures.',
      'Coordinate maintenance and service lifecycle.',
    ],
    architectureFit:
      'MANUFACTURER closes the loop from design/deployment to field operations.',
    architectureExample:
      'MANUFACTURER correlates model-level anomalies with deployment batches and initiates lifecycle maintenance advisories.',
    scenarioFlow:
      'Field Telemetry -&gt; Model Grouping -&gt; Manufacturer Analytics -&gt; Service Recommendation -&gt; Lifecycle Action',
    codeRef: `const isManufacturer =
  currentRole === 'MANUFACTURER';`,
  },
};

export default function RoleDocsPage() {
  const { role } = useParams();
  const normalized = String(role || '').toLowerCase();
  const data = roleContent[normalized];

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

  const roleKeys = useMemo(() => Object.keys(roleContent), []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-black">Role page not found</h1>
          <p className="mt-2 text-sm text-slate-300">Try one of: {roleKeys.join(', ')}</p>
          <Link to="/docs" className="mt-4 inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950">
            Back to Docs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-10 border-b backdrop-blur-xl ${isDark ? 'border-white/10 bg-slate-950/80' : 'border-slate-900/10 bg-white/80'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className={`text-lg font-black ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{data.title} Docs</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <Link to="/docs" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
              All Docs
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className={`rounded-3xl border p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-900/10 bg-white'}`}>
          <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{data.title}</h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data.purpose}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-900/10 bg-slate-50'}`}>
              <h3 className={`text-sm font-black uppercase tracking-wide ${isDark ? 'text-cyan-200' : 'text-cyan-700'}`}>Key Workflows</h3>
              <ul className={`mt-2 list-disc space-y-1 pl-5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {data.keyWorkflows.map((workflow) => (
                  <li key={workflow}>{workflow}</li>
                ))}
              </ul>
            </article>

            <article className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-900/10 bg-slate-50'}`}>
              <h3 className={`text-sm font-black uppercase tracking-wide ${isDark ? 'text-cyan-200' : 'text-cyan-700'}`}>Architecture Fit</h3>
              <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data.architectureFit}</p>
            </article>
          </div>
        </section>

        <section className="mt-6">
          <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Code Mapping</h3>
          <pre className={`mt-3 overflow-x-auto rounded-2xl border p-4 text-xs ${isDark ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-900/10 bg-slate-100 text-slate-800'}`}>
            <code>{data.codeRef}</code>
          </pre>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-900/10 bg-slate-50'}`}>
            <h3 className={`text-sm font-black uppercase tracking-wide ${isDark ? 'text-cyan-200' : 'text-cyan-700'}`}>
              Architecture Example
            </h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data.architectureExample}</p>
          </article>

          <article className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-900/10 bg-slate-50'}`}>
            <h3 className={`text-sm font-black uppercase tracking-wide ${isDark ? 'text-cyan-200' : 'text-cyan-700'}`}>
              Scenario Flow
            </h3>
            <p className={`mt-2 font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data.scenarioFlow}</p>
          </article>
        </section>

        <footer className="mt-10 text-center text-sm">
          <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Product contact: shanthosh.krishnan@outlook.com</p>
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
