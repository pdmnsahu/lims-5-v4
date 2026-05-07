import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Table, Badge, Modal, Field, Alert, Empty } from '../components/shared/UI';
import { ClipboardList, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SampleGroupsPage() {
  const { user }        = useAuth();
  const [groups,   setGroups]   = useState([]);
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  // Form state
  const [groupRefId, setGroupRefId] = useState('');
  const [clientId,   setClientId]   = useState('');
  const [rows,       setRows]       = useState([{ sample_ref_id: '', description: '' }]);

  const load = async () => {
    setLoading(true);
    const [g, c] = await Promise.all([api.getSampleGroups(), api.getClients()]);
    setGroups(g);
    setClients(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openModal = () => {
    setGroupRefId(''); setClientId(''); setRows([{ sample_ref_id: '', description: '' }]);
    setError(''); setModal(true);
  };

  const addRow    = () => setRows(r => [...r, { sample_ref_id: '', description: '' }]);
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: val } : row));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupRefId || !clientId) return setError('Group ID and client are required');
    const invalidRows = rows.filter(r => !r.sample_ref_id.trim());
    if (invalidRows.length) return setError('All sample rows need a Sample Ref ID');
    setSaving(true); setError('');
    try {
      await api.createSampleGroup({ group_ref_id: groupRefId, client_id: clientId, samples: rows });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sample Groups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Batches of coal samples received from clients.</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openModal}>
            <Plus size={15} /> Register Group
          </button>
        )}
      </div>

      <Table headers={['Group Ref ID', 'Client', 'Samples', 'Status', 'Received', 'Actions']} loading={loading}>
        {groups.length === 0 && !loading
          ? <tr><td colSpan={6}><Empty message="No sample groups registered." icon={ClipboardList} /></td></tr>
          : groups.map(g => (
            <tr key={g.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{g.group_ref_id}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{g.client_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{g.sample_count} sample(s)</td>
              <td className="px-4 py-3"><Badge status={g.status} /></td>
              <td className="px-4 py-3 text-sm text-gray-400">{new Date(g.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <Link
                  to={`/sample-groups/${g.id}`}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                >
                  View <ChevronRight size={12} />
                </Link>
              </td>
            </tr>
          ))}
      </Table>

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Register Sample Group" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Group Reference ID" required>
              <input className="input font-mono" required value={groupRefId} onChange={e => setGroupRefId(e.target.value)} placeholder="GRP-2024-001" />
            </Field>
            <Field label="Client" required>
              <select className="input" required value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Sample rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Samples <span className="text-brand-600">*</span></label>
              <button type="button" onClick={addRow} className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{i + 1}.</span>
                  <input
                    className="input font-mono flex-1"
                    required
                    placeholder="Sample Ref ID e.g. S-001"
                    value={row.sample_ref_id}
                    onChange={e => updateRow(i, 'sample_ref_id', e.target.value)}
                  />
                  <input
                    className="input flex-1"
                    placeholder="Description (optional)"
                    value={row.description}
                    onChange={e => updateRow(i, 'description', e.target.value)}
                  />
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{rows.length} sample(s) to register</p>
          </div>

          <Alert type="error" message={error} />

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <ClipboardList size={15} /> {saving ? 'Registering…' : 'Register Group'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
