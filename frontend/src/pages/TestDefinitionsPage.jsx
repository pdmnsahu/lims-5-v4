import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Table, Modal, Field, Alert, Confirm, Empty } from '../components/shared/UI';
import { FlaskConical, Plus, Pencil, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';

const blank = { name: '', unit: '', description: '' };

export default function TestDefinitionsPage() {
  const [defs,    setDefs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form,    setForm]    = useState(blank);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.getTestDefinitions();
    setDefs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openEdit   = (d) => {
    setEditing(d);
    setForm({ name: d.name, unit: d.unit || '', description: d.description || '' });
    setError(''); setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.updateTestDef(editing.id, form);
      else         await api.createTestDef(form);
      setModal(false); load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (d) => {
    await api.updateTestDef(d.id, { is_active: !d.is_active });
    load();
  };

  const handleDelete = async () => {
    try {
      await api.deleteTestDef(confirm.id);
      setConfirm(null); load();
    } catch (err) { alert(err.message); setConfirm(null); }
  };

  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Definitions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define the parameters available for coal sample testing.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15} /> Add Test
        </button>
      </div>

      <Table headers={['Test Name', 'Unit', 'Description', 'Status', 'Actions']} loading={loading}>
        {defs.length === 0 && !loading
          ? <tr><td colSpan={5}><Empty message="No test definitions yet. Add one above." icon={FlaskConical} /></td></tr>
          : defs.map(d => (
            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <FlaskConical size={13} className="text-brand-600" />
                  </div>
                  <span className="font-medium text-gray-800 text-sm">{d.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{d.unit || '—'}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 max-w-[240px] truncate">{d.description || '—'}</td>
              <td className="px-4 py-3">
                <span className={`badge ${d.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {d.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => toggleActive(d)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title={d.is_active ? 'Deactivate' : 'Activate'}>
                    {d.is_active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => setConfirm(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
      </Table>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Test Definition' : 'Add Test Definition'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Test Name" required>
            <input className="input" required value={form.name} onChange={F('name')} placeholder="e.g. Ash Content" />
          </Field>
          <Field label="Unit">
            <input className="input font-mono" value={form.unit} onChange={F('unit')} placeholder="e.g. %, kcal/kg, °C" />
          </Field>
          <Field label="Description">
            <textarea className="input min-h-[72px] resize-none" value={form.description} onChange={F('description')} placeholder="Brief description of the test…" />
          </Field>
          <Alert type="error" message={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Test'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Test Definition"
        message={`Delete "${confirm?.name}"? This only works if no samples have been assigned this test. Otherwise, deactivate it.`}
        danger
      />
    </div>
  );
}
