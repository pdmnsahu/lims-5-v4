import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { downloadSampleReport, downloadGroupReport } from '../\lib/pdf';
import { Badge, Empty, Table, PageSpinner } from '../components/shared/UI';
import { FileDown, FileText, Loader2 } from 'lucide-react';

// Group tests by sample_db_id so we can show per-sample download
function groupBySample(tests) {
  const map = new Map();
  tests.forEach(t => {
    const sid = t.sample_db_id;
    if (!map.has(sid)) {
      map.set(sid, {
        sample_db_id:    sid,
        sample_ref_id:   t.sample_ref_id,
        lab_internal_id: t.lab_internal_id,
        group_ref_id:    t.group_ref_id,
        client_name:     t.client_name,
        tests: [],
      });
    }
    map.get(sid).tests.push(t);
  });
  return Array.from(map.values());
}

export default function ReportsPage() {
  const [tests,     setTests]     = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dlLoading, setDlLoading] = useState({});
  const [view,      setView]      = useState('samples');

  useEffect(() => {
    Promise.all([api.getTests(), api.getSampleGroups()]).then(([t, g]) => {
      setTests(t);
      setGroups(g);
      setLoading(false);
    });
  }, []);

  const downloadSample = async (sampleId, label) => {
    setDlLoading(p => ({ ...p, [sampleId]: true }));
    try {
      const { sample, tests } = await api.getSampleReport(sampleId);
      if (!tests.length) return alert('No approved tests for this sample yet.');
      await downloadSampleReport(sample, tests);
    } catch (e) { alert(e.message); }
    finally { setDlLoading(p => ({ ...p, [sampleId]: false })); }
  };

  const downloadGroup = async (groupId) => {
    setDlLoading(p => ({ ...p, [groupId]: true }));
    try {
      const { group, tests } = await api.getGroupReport(groupId);
      if (!tests.length) return alert('No approved tests in this group yet.');
      downloadGroupReport(group, tests);
    } catch (e) { alert(e.message); }
    finally { setDlLoading(p => ({ ...p, [groupId]: false })); }
  };

  if (loading) return <PageSpinner />;

  const sampleRows = groupBySample(tests);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download PDF reports. Each sample gets one report containing all its approved tests.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        {[{ key: 'samples', label: 'By Sample' }, { key: 'groups', label: 'By Group' }].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${view === tab.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Per-sample reports */}
      {view === 'samples' && (
        <Table headers={['Lab Internal ID', 'Sample Ref ID', 'Group', 'Client', 'Approved Tests', 'Download']} loading={false}>
          {sampleRows.length === 0
            ? <tr><td colSpan={6}><Empty message="No approved tests yet." icon={FileText} /></td></tr>
            : sampleRows.map(s => (
              <tr key={s.sample_db_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-700">{s.lab_internal_id || '—'}</td>
                <td className="px-4 py-3 font-mono text-sm text-gray-600">{s.sample_ref_id}</td>
                <td className="px-4 py-3 font-mono text-sm text-gray-500">{s.group_ref_id}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.client_name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.tests.map(t => (
                      <span key={t.id} className="badge bg-green-50 text-green-700 text-xs">{t.test_name}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => downloadSample(s.sample_db_id, s.lab_internal_id || s.sample_ref_id)}
                    disabled={dlLoading[s.sample_db_id]} className="btn-primary py-1 px-3 text-xs">
                    {dlLoading[s.sample_db_id] ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                    PDF Report
                  </button>
                </td>
              </tr>
            ))}
        </Table>
      )}

      {/* Group reports */}
      {view === 'groups' && (
        <Table headers={['Group Ref ID', 'Client', 'Samples', 'Status', 'Download']} loading={false}>
          {groups.length === 0
            ? <tr><td colSpan={5}><Empty message="No groups available." icon={FileText} /></td></tr>
            : groups.map(g => (
              <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{g.group_ref_id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{g.client_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{g.sample_count} sample(s)</td>
                <td className="px-4 py-3"><Badge status={g.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => downloadGroup(g.id)} disabled={dlLoading[g.id]}
                    className="btn-primary py-1 px-3 text-xs">
                    {dlLoading[g.id] ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                    Download Group PDF
                  </button>
                </td>
              </tr>
            ))}
        </Table>
      )}
    </div>
  );
}
