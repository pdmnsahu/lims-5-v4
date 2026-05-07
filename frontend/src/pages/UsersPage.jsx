import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Table, Badge, Modal, Field, Alert, Confirm, Empty } from '../components/shared/UI';
import { UserPlus, Trash2, ToggleLeft, ToggleRight, KeyRound, Copy, Check } from 'lucide-react';

const ROLES = ['admin', 'lab_manager', 'chemist'];

export default function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [created, setCreated] = useState(null);
  const [error,   setError]   = useState('');
  const [form,    setForm]    = useState({ name: '', role: 'admin', username: '' });
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState('');
  const [copied,  setCopied]  = useState(false);

  // Live preview of auto-generated username when field is empty
  const autoPreview = form.name
    ? `${form.name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}.relims`
    : '';

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.filter(u => u.role !== 'super_admin'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = () => {
    setForm({ name: '', role: 'admin', username: '' });
    setError('');
    setModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { name: form.name, role: form.role };
      if (form.username.trim()) payload.username = form.username.trim();
      const result = await api.createUser(payload);
      setModal(false);
      setCreated({ username: result.username, password: result.default_password });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try { await api.updateUser(u.id, { is_active: !u.is_active }); load(); }
    catch (err) { alert(err.message); }
  };

  const handleDelete = async () => {
    try { await api.deleteUser(confirm.id); setConfirm(null); load(); }
    catch (err) { alert(err.message); setConfirm(null); }
  };

  const handleResetPassword = async (u) => {
    if (!window.confirm(`Reset password for ${u.name} back to their username?`)) return;
    try {
      await api.resetPassword(u.id);
      alert(`Password reset to: ${u.username}`);
    } catch (err) { alert(err.message); }
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Username: ${created.username}\nPassword: ${created.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = users.filter(u =>
    !filter ||
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.username.toLowerCase().includes(filter.toLowerCase()) ||
    u.role.includes(filter)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage lab staff accounts.</p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <input className="input max-w-xs" placeholder="Search name, username or role…"
          value={filter} onChange={e => setFilter(e.target.value)} />
        <span className="text-sm text-gray-400">{filtered.length} user(s)</span>
      </div>

      <Table headers={['Name', 'Username', 'Role', 'Status', 'Created', 'Actions']} loading={loading}>
        {filtered.length === 0 && !loading
          ? <tr><td colSpan={6}><Empty message="No users found." icon={UserPlus} /></td></tr>
          : filtered.map(u => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-700">{u.name[0]}</span>
                  </div>
                  <span className="font-medium text-gray-800 text-sm">{u.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">{u.username}</td>
              <td className="px-4 py-3"><Badge status={u.role} /></td>
              <td className="px-4 py-3">
                <span className={`badge ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                    {u.is_active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => handleResetPassword(u)} title="Reset password to username"
                    className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                    <KeyRound size={14} />
                  </button>
                  <button onClick={() => setConfirm(u)} title="Delete user"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
      </Table>

      {/* ── Create User Modal ──────────────────────────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add New User" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Full Name" required>
            <input
              className="input"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Jane Smith"
            />
          </Field>

          <Field label="Username">
            <input
              className="input font-mono"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder={autoPreview || 'firstname.relims'}
              spellCheck={false}
            />
            {/* Dynamic hint — changes based on what the user has typed */}
            {(() => {
              const typed = form.username.trim();
              if (!typed) {
                // Nothing typed yet — show auto-generate preview
                return (
                  <p className="text-xs text-gray-400 mt-1">
                    {autoPreview
                      ? <>Leave blank to auto-generate: <span className="font-mono font-semibold text-gray-600">{autoPreview}</span></>
                      : 'Leave blank to auto-generate, or type a custom username below.'}
                  </p>
                );
              }
              // Something typed — validate format live
              const valid = /^[a-z0-9]+\.relims$/.test(typed.toLowerCase());
              return (
                <p className={`text-xs mt-1 flex items-center gap-1 ${valid ? 'text-green-600' : 'text-red-500'}`}>
                  {valid ? '✓' : '✗'}
                  {valid
                    ? <>Valid — will use <span className="font-mono font-semibold">{typed.toLowerCase()}</span></>
                    : <>Must be lowercase letters/numbers followed by <span className="font-mono font-semibold">.relims</span> — e.g. <span className="font-mono">john.relims</span></>}
                </p>
              );
            })()}
          </Field>

          <Field label="Role" required>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </Field>

          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
            Default password will be set to the username. Share credentials with the user after creation.
          </div>

          <Alert type="error" message={error} />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || (!!form.username.trim() && !/^[a-z0-9]+\.relims$/.test(form.username.trim().toLowerCase()))}
            >
              <UserPlus size={15} /> {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Credentials Modal ─────────────────────────────────────────────── */}
      <Modal open={!!created} onClose={() => setCreated(null)} title="User Created" size="sm">
        {created && (
          <div className="space-y-4">
            <Alert type="success" message="User created. Share these credentials securely." />
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 font-mono text-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans text-xs uppercase font-semibold">Username</span>
                <span className="font-semibold text-gray-900">{created.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans text-xs uppercase font-semibold">Password</span>
                <span className="font-semibold text-gray-900">{created.password}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">Password equals the username by default.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={copyCredentials}>
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy credentials'}
              </button>
              <button className="btn-primary" onClick={() => setCreated(null)}>Done</button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Delete ${confirm?.name} (${confirm?.username})? If they have tests assigned, deactivate them instead.`}
        danger
      />
    </div>
  );
}
