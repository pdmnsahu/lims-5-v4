import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Table, Badge, Empty, PageSpinner } from '../components/shared/UI';
import { FlaskConical } from 'lucide-react';

export default function SuperAdminAllTestsPage() {
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    api.getTests().then(t => { setTests(t); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? tests : tests.filter(t => t.status === filter);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Tests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete view of every test assignment across the system.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        {['all','pending','submitted','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              filter===s ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s} <span className="text-xs text-gray-400">({tests.filter(t => s==='all'||t.status===s).length})</span>
          </button>
        ))}
      </div>

      <Table headers={['Test', 'Unit', 'Sample Ref ID', 'Lab ID', 'Group', 'Client', 'Chemist', 'Result', 'Status']} loading={false}>
        {filtered.length === 0
          ? <tr><td colSpan={9}><Empty message="No tests." icon={FlaskConical} /></td></tr>
          : filtered.map(t => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.test_name}</td>
              <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.test_unit || '—'}</span></td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">{t.sample_ref_id}</td>
              <td className="px-4 py-3 font-mono text-sm text-blue-600">{t.lab_internal_id || '—'}</td>
              <td className="px-4 py-3 font-mono text-sm text-gray-500">{t.group_ref_id}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{t.client_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{t.chemist_name || '—'}</td>
              <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                {t.result_value ? `${t.result_value} ${t.test_unit || ''}` : <span className="text-gray-300 font-normal">—</span>}
              </td>
              <td className="px-4 py-3"><Badge status={t.status} /></td>
            </tr>
          ))}
      </Table>
    </div>
  );
}
