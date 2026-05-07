import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Table, Badge, Empty, PageSpinner } from '../components/shared/UI';
import { ClipboardList, ChevronRight } from 'lucide-react';

export default function SuperAdminAllGroupsPage() {
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');

  useEffect(() => {
    api.getSampleGroups().then(g => { setGroups(g); setLoading(false); });
  }, []);

  const filtered = groups.filter(g =>
    !filter ||
    g.group_ref_id.toLowerCase().includes(filter.toLowerCase()) ||
    g.client_name?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Sample Groups</h1>
        <p className="text-sm text-gray-500 mt-0.5">Full visibility across all sample batches in the system.</p>
      </div>

      <div className="flex gap-4 items-center">
        <input className="input max-w-xs" placeholder="Search group ID or client…" value={filter} onChange={e => setFilter(e.target.value)} />
        <div className="flex gap-3">
          {['collected','in_progress','completed'].map(s => (
            <span key={s} className={`badge cursor-pointer ${
              s==='collected'   ? 'bg-blue-50 text-blue-700'  :
              s==='in_progress' ? 'bg-amber-50 text-amber-700':
              'bg-green-50 text-green-700'}`}
              onClick={() => setFilter(filter === s ? '' : s)}>
              {s.replace('_',' ')}
            </span>
          ))}
        </div>
      </div>

      <Table headers={['Group Ref ID', 'Client', 'Samples', 'Status', 'Collected By', 'Date', 'View']} loading={false}>
        {filtered.length === 0
          ? <tr><td colSpan={7}><Empty message="No groups found." icon={ClipboardList} /></td></tr>
          : filtered.map(g => (
            <tr key={g.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono font-semibold text-gray-800">{g.group_ref_id}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{g.client_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{g.sample_count}</td>
              <td className="px-4 py-3"><Badge status={g.status} /></td>
              <td className="px-4 py-3 text-sm text-gray-500">{g.collected_by_name || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-400">{new Date(g.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <Link to={`/sample-groups/${g.id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
                  View <ChevronRight size={12} />
                </Link>
              </td>
            </tr>
          ))}
      </Table>
    </div>
  );
}
