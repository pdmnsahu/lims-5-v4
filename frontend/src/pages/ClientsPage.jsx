import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Table, Modal, Field, Alert, Confirm, Empty } from '../components/shared/UI';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';

const blank = { name: '', contact_person: '', email: '', phone: '', address: '' };

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form,    setForm]    = useState(blank);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.getClients();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openEdit   = (c) => { setEditing(c); setForm({ name: c.name, contact_person: c.contact_person || '', email: c.email || '', phone: c.phone || '', address: c.address || '' }); setError(''); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.updateClient(editing.id, form);
      else         await api.createClient(form);
      setModal(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await api.deleteClient(confirm.id);
    setConfirm(null);
    load();
  };

  const F = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Companies that submit coal samples for testing.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15} /> Add Client
        </button>
      </div>

      <Table headers={['Client', 'Contact', 'Email', 'Phone', 'Address', 'Actions']} loading={loading}>
        {clients.length === 0 && !loading
          ? <tr><td colSpan={6}><Empty message="No clients yet." icon={Building2} /></td></tr>
          : clients.map(c => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">{c.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{c.contact_person || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{c.email || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{c.phone || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-400 max-w-[180px] truncate">{c.address || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirm(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
      </Table>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Client' : 'Add Client'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Company Name" required>
            <input className="input" required value={form.name} onChange={F('name')} placeholder="Acme Coal Ltd." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Person">
              <input className="input" value={form.contact_person} onChange={F('contact_person')} placeholder="John Doe" />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone} onChange={F('phone')} placeholder="+91 98765 43210" />
            </Field>
          </div>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={F('email')} placeholder="contact@acmecoal.com" />
          </Field>
          <Field label="Address">
            <textarea className="input min-h-[72px] resize-none" value={form.address} onChange={F('address')} placeholder="123 Industrial Area, City" />
          </Field>
          <Alert type="error" message={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Delete "${confirm?.name}"? This may affect existing sample groups.`}
        danger
      />
    </div>
  );
}
