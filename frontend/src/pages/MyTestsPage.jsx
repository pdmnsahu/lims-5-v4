import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { Badge, Modal, Field, Alert, Empty, Table } from '../components/shared/UI';
import { Beaker, Send, Upload, X, ImagePlus, Loader2 } from 'lucide-react';

// The 3 fixed test names — GCV requires an image upload
const GCV_TEST_NAME = 'Gross Calorific Value';

export default function MyTestsPage() {
  const [tests,      setTests]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState({ result_value: '', result_notes: '' });
  const [imageFile,  setImageFile]  = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [filter,     setFilter]     = useState('all');
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getTests();
      setTests(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isGCV = (test) => test?.test_name === GCV_TEST_NAME;

  const openSubmit = (t) => {
    setForm({ result_value: t.result_value || '', result_notes: t.result_notes || '' });
    setImageFile(null);
    setImagePreview('');
    setUploadedUrl(t.image_url || '');
    setError('');
    setModal(t);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setUploadedUrl('');
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!imageFile || !modal) return;
    setUploading(true);
    setError('');
    try {
      const { image_url } = await api.uploadCalorimeter(modal.id, imageFile);
      setUploadedUrl(image_url);
      setImageFile(null);
    } catch (err) {
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.result_value) return setError('Result value is required');
    if (isNaN(Number(form.result_value))) return setError('Result value must be a number');
    if (isGCV(modal) && !uploadedUrl) return setError('Please upload the Parr calorimeter image before submitting');
    setSaving(true); setError('');
    try {
      await api.submitTest(modal.id, {
        result_value: form.result_value,
        result_notes: form.result_notes,
        image_url:    uploadedUrl || undefined,
      });
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setUploadedUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = tests.filter(t => filter === 'all' || t.status === filter);
  const canSubmit = (t) => t.status === 'pending' || t.status === 'rejected';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in numeric results and submit. GCV requires a calorimeter snapshot.</p>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
          {loadError}
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-100">
        {['all','pending','rejected','submitted','approved'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              filter === s ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {s} <span className="ml-1 text-xs text-gray-400">({tests.filter(t => s==='all'||t.status===s).length})</span>
          </button>
        ))}
      </div>

      <Table headers={['Test', 'Lab ID', 'Group', 'Client', 'Status', 'Rejection Reason', 'Action']} loading={loading}>
        {filtered.length === 0 && !loading
          ? <tr><td colSpan={7}><Empty message="No tests in this category." icon={Beaker} /></td></tr>
          : filtered.map(t => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800 text-sm">{t.test_name}</p>
                <p className="text-xs text-gray-400">{t.test_unit}</p>
                {isGCV(t) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                    <ImagePlus size={9} /> Image required
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-blue-600">{t.lab_internal_id || '—'}</td>
              <td className="px-4 py-3 font-mono text-sm text-gray-500">{t.group_ref_id}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{t.client_name}</td>
              <td className="px-4 py-3"><Badge status={t.status} /></td>
              <td className="px-4 py-3 text-xs text-red-500 max-w-[160px] truncate">{t.rejection_reason || '—'}</td>
              <td className="px-4 py-3">
                {canSubmit(t)
                  ? <button onClick={() => openSubmit(t)} className="btn-primary py-1 px-3 text-xs">
                      <Send size={12} /> {t.status === 'rejected' ? 'Resubmit' : 'Submit'}
                    </button>
                  : t.status === 'submitted'
                  ? <span className="text-xs text-gray-400 italic">Awaiting review</span>
                  : <span className="text-xs text-green-600 font-medium">✓ Approved</span>}
              </td>
            </tr>
          ))}
      </Table>

      {/* ── Submit Modal ─────────────────────────────────────────────────── */}
      <Modal open={!!modal} onClose={() => setModal(null)} title="Submit Test Result" size="md">
        {modal && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Test info card */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-semibold uppercase">Test</span>
                <span className="text-sm font-semibold text-gray-800">{modal.test_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-semibold uppercase">Unit</span>
                <span className="font-mono text-sm text-gray-700">{modal.test_unit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-semibold uppercase">Lab ID</span>
                <span className="font-mono text-sm text-blue-600">{modal.lab_internal_id || '—'}</span>
              </div>
            </div>

            {modal.status === 'rejected' && modal.rejection_reason && (
              <Alert type="error" message={`Rejected: ${modal.rejection_reason}`} />
            )}

            {/* Numeric result input */}
            <Field label={`Result Value (${modal.test_unit})`} required>
              <input
                type="number"
                step="any"
                className="input font-mono text-lg"
                required
                value={form.result_value}
                onChange={e => setForm(f => ({ ...f, result_value: e.target.value }))}
                placeholder={modal.test_name === 'Moisture' ? 'e.g. 8.5' : modal.test_name === 'Ash' ? 'e.g. 12.3' : 'e.g. 6250'}
                autoFocus
              />
            </Field>

            {/* GCV: Parr calorimeter image upload */}
            {isGCV(modal) && (
              <div className="space-y-2">
                <label className="label">
                  Parr Calorimeter Snapshot <span className="text-brand-600">*</span>
                  <span className="text-xs text-gray-400 ml-2 normal-case font-normal">(required for GCV)</span>
                </label>

                {/* Show uploaded/existing image */}
                {(uploadedUrl || imagePreview) && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={uploadedUrl || imagePreview}
                      alt="Calorimeter snapshot"
                      className="w-full max-h-48 object-contain"
                    />
                    {uploadedUrl && (
                      <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        ✓ Uploaded
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 left-2 p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 shadow"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {!uploadedUrl && (
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors text-sm text-gray-500">
                      <ImagePlus size={16} />
                      {imageFile ? imageFile.name : 'Choose image file…'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                    {imageFile && !uploadedUrl && (
                      <button
                        type="button"
                        onClick={handleImageUpload}
                        disabled={uploading}
                        className="btn-primary shrink-0"
                      >
                        {uploading
                          ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                          : <><Upload size={14} /> Upload</>}
                      </button>
                    )}
                  </div>
                )}

                {uploadedUrl && (
                  <button type="button" onClick={clearImage} className="text-xs text-gray-400 hover:text-red-500 underline">
                    Replace image
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <Field label="Analyst Notes (optional)">
              <textarea
                className="input min-h-[72px] resize-none"
                value={form.result_notes}
                onChange={e => setForm(f => ({ ...f, result_notes: e.target.value }))}
                placeholder="Any observations or remarks…"
              />
            </Field>

            <Alert type="error" message={error} />
            <p className="text-xs text-gray-400">
              Once submitted, results cannot be changed unless rejected by the lab manager.
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving || uploading}>
                <Send size={14} /> {saving ? 'Submitting…' : 'Submit Result'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
