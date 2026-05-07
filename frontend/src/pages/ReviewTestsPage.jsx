import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge, Modal, Field, Alert, Empty, Table } from '../components/shared/UI';
import { CheckCircle, XCircle, FlaskConical } from 'lucide-react';

export default function ReviewTestsPage() {
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);   // { test, action }
  const [reason,  setReason]  = useState('');
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState('submitted');

  const load = async () => {
    setLoading(true);
    const data = await api.getTests();
    setTests(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openReview = (test, action) => {
    setReason(''); setError(''); setModal({ test, action });
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.reviewTest(modal.test.id, {
        action: modal.action,
        rejection_reason: modal.action === 'reject' ? reason : undefined,
      });
      setModal(null);
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const filtered = tests.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Tests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Approve or reject submitted test results from chemists.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-100">
        {['submitted','all','pending','approved','rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              filter === s ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
            <span className="ml-1 text-xs text-gray-400">({tests.filter(t => s==='all' || t.status===s).length})</span>
          </button>
        ))}
      </div>

      <Table
        headers={['Test', 'Sample', 'Group', 'Client', 'Chemist', 'Result', 'Status', 'Actions']}
        loading={loading}
      >
        {filtered.length === 0 && !loading
          ? <tr><td colSpan={8}><Empty message="No tests here." icon={FlaskConical} /></td></tr>
          : filtered.map(t => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800 text-sm">{t.test_name}</p>
                <p className="text-xs text-gray-400">{t.test_unit}</p>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">{t.sample_ref_id}</td>
              <td className="px-4 py-3 font-mono text-sm text-gray-500">{t.group_ref_id}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{t.client_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{t.chemist_name || '—'}</td>
              <td className="px-4 py-3">
                {t.result_value
                  ? <span className="font-mono text-sm font-semibold text-gray-800">{t.result_value} <span className="text-gray-400 font-normal text-xs">{t.test_unit}</span></span>
                  : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-3"><Badge status={t.status} /></td>
              <td className="px-4 py-3">
                {t.status === 'submitted' ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openReview(t, 'approve')}
                      className="inline-flex items-center gap-1 text-xs btn-success py-1 px-2"
                    >
                      <CheckCircle size={11} /> Approve
                    </button>
                    <button
                      onClick={() => openReview(t, 'reject')}
                      className="inline-flex items-center gap-1 text-xs btn-danger py-1 px-2"
                    >
                      <XCircle size={11} /> Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">—</span>
                )}
              </td>
            </tr>
          ))}
      </Table>

      {/* Review Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.action === 'approve' ? 'Approve Test Result' : 'Reject Test Result'}
        size="sm"
      >
        {modal && (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 font-semibold uppercase">Test</span>
                <span className="text-sm font-semibold text-gray-800">{modal.test.test_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 font-semibold uppercase">Result</span>
                <span className="font-mono text-sm text-gray-800">{modal.test.result_value} {modal.test.test_unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 font-semibold uppercase">Chemist</span>
                <span className="text-sm text-gray-600">{modal.test.chemist_name}</span>
              </div>
              {modal.test.result_notes && (
                <div>
                  <span className="text-xs text-gray-500 font-semibold uppercase block mb-1">Notes</span>
                  <p className="text-sm text-gray-600 bg-white rounded p-2 border border-gray-100">{modal.test.result_notes}</p>
                </div>
              )}
            </div>

            {modal.action === 'reject' && (
              <Field label="Rejection Reason" required>
                <textarea
                  className="input min-h-[80px] resize-none"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Explain what needs to be corrected…"
                  autoFocus
                />
              </Field>
            )}

            <Alert type="error" message={error} />

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              {modal.action === 'approve'
                ? <button type="submit" className="btn-success" disabled={saving}><CheckCircle size={14} /> {saving ? 'Approving…' : 'Approve'}</button>
                : <button type="submit" className="btn-danger"   disabled={saving}><XCircle   size={14} /> {saving ? 'Rejecting…' : 'Reject'}</button>}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
