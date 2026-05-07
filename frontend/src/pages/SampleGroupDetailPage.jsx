import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, Modal, Field, Alert, PageSpinner } from '../components/shared/UI';
import { useAuth } from '../contexts/AuthContext';
import { FlaskConical, Hash, Layers, Check, Minus, ChevronDown, ChevronUp } from 'lucide-react';

export default function SampleGroupDetailPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const [group,     setGroup]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [chemists,  setChemists]  = useState([]);
  const [testDefs,  setTestDefs]  = useState([]);

  // Lab ID modal
  const [labModal, setLabModal] = useState(null);
  const [labId,    setLabId]    = useState('');
  const [labError, setLabError] = useState('');
  const [labSaving,setLabSaving]= useState(false);

  // Bulk assign modal
  const [bulkOpen,   setBulkOpen]   = useState(false);
  const [bulkError,  setBulkError]  = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Bulk form state
  const [selectedSamples,  setSelectedSamples]  = useState({}); // { [sampleId]: bool }
  const [assignments, setAssignments] = useState([           // list of { test_definition_id, assigned_chemist_id }
    { test_definition_id: '', assigned_chemist_id: '' }
  ]);

  const isManager = user.role === 'lab_manager';

  const load = async () => {
    setLoading(true);
    const data = await api.getSampleGroup(id);
    setGroup(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (isManager) {
      Promise.all([api.getUsers('chemist'), api.getTestDefinitions()]).then(([c, d]) => {
        setChemists(c); setTestDefs(d);
      });
    }
  }, [id]);

  // ── Lab ID ─────────────────────────────────────────────────────────────────
  const handleAssignLabId = async (e) => {
    e.preventDefault();
    setLabSaving(true); setLabError('');
    try {
      await api.assignLabId(labModal.id, labId);
      setLabModal(null);
      load();
    } catch (err) { setLabError(err.message); }
    finally { setLabSaving(false); }
  };

  // ── Bulk assign helpers ────────────────────────────────────────────────────
  const openBulk = () => {
    // Pre-select all samples
    const initial = {};
    group.samples.forEach(s => { initial[s.id] = true; });
    setSelectedSamples(initial);
    setAssignments([{ test_definition_id: '', assigned_chemist_id: '' }]);
    setBulkError(''); setBulkResult(null);
    setBulkOpen(true);
  };

  const allSelected = group
    ? group.samples.every(s => selectedSamples[s.id])
    : false;

  const toggleAll = () => {
    const next = {};
    group.samples.forEach(s => { next[s.id] = !allSelected; });
    setSelectedSamples(next);
  };

  const toggleSample = (sid) => setSelectedSamples(p => ({ ...p, [sid]: !p[sid] }));

  const addAssignmentRow = () =>
    setAssignments(a => [...a, { test_definition_id: '', assigned_chemist_id: '' }]);

  const removeAssignmentRow = (i) =>
    setAssignments(a => a.filter((_, idx) => idx !== i));

  const updateAssignment = (i, key, val) =>
    setAssignments(a => a.map((row, idx) => idx === i ? { ...row, [key]: val } : row));

  // For a given sample, which test_definition_ids are already assigned?
  const assignedDefIds = useMemo(() => {
    const map = {};
    group?.samples.forEach(s => {
      map[s.id] = new Set((s.assigned_tests || []).map(t => t.test_definition_id));
    });
    return map;
  }, [group]);

  // Available test defs for a given assignment row:
  // exclude ones already chosen in other rows + already assigned on ALL selected samples
  const availableTests = (rowIdx) => {
    const chosenInOtherRows = new Set(
      assignments.filter((_, i) => i !== rowIdx).map(r => r.test_definition_id).filter(Boolean)
    );
    const selectedIds = Object.entries(selectedSamples).filter(([,v]) => v).map(([k]) => k);
    return testDefs.filter(td => {
      if (chosenInOtherRows.has(td.id)) return false;
      // If ALL selected samples already have this test → hide it
      if (selectedIds.length > 0 && selectedIds.every(sid => assignedDefIds[sid]?.has(td.id))) return false;
      return true;
    });
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    const selectedIds = Object.entries(selectedSamples).filter(([,v]) => v).map(([k]) => k);
    if (!selectedIds.length) return setBulkError('Select at least one sample');
    const validAssignments = assignments.filter(a => a.test_definition_id && a.assigned_chemist_id);
    if (!validAssignments.length) return setBulkError('Add at least one complete test assignment');
    setBulkSaving(true); setBulkError('');
    try {
      const result = await api.bulkAssign({ sample_ids: selectedIds, assignments: validAssignments });
      setBulkResult(result);
      load();
    } catch (err) { setBulkError(err.message); }
    finally { setBulkSaving(false); }
  };

  if (loading) return <PageSpinner />;
  if (!group)  return <div className="p-8 text-gray-500">Group not found.</div>;

  const selectedCount = Object.values(selectedSamples).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">GROUP</span>
            <h1 className="text-2xl font-bold text-gray-900">{group.group_ref_id}</h1>
            <Badge status={group.status} />
          </div>
          <p className="text-sm text-gray-500">
            Client: <span className="font-medium text-gray-700">{group.client_name}</span>
            {' · '}Collected by <span className="font-medium text-gray-700">{group.collected_by_name}</span>
            {' · '}{group.samples.length} sample(s)
          </p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={openBulk}>
            <Layers size={15} /> Bulk Assign Tests
          </button>
        )}
      </div>

      {/* Samples table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Samples ({group.samples.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Sample Ref ID', 'Lab Internal ID', 'Description', 'Assigned Tests', isManager ? 'Actions' : ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {group.samples.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{s.sample_ref_id}</td>
                  <td className="px-4 py-3">
                    {s.lab_internal_id
                      ? <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.lab_internal_id}</span>
                      : <span className="text-gray-300 text-xs italic">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{s.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.assigned_tests || []).length === 0
                        ? <span className="text-xs text-gray-300 italic">None</span>
                        : (s.assigned_tests || []).map(t => (
                          <span key={t.test_id} className={`badge text-xs ${
                            t.status === 'approved'  ? 'bg-green-50 text-green-700'   :
                            t.status === 'submitted' ? 'bg-purple-50 text-purple-700' :
                            t.status === 'rejected'  ? 'bg-red-50 text-red-700'       :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {t.test_name}
                          </span>
                        ))}
                    </div>
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      {!s.lab_internal_id && (
                        <button
                          onClick={() => { setLabId(''); setLabError(''); setLabModal(s); }}
                          className="inline-flex items-center gap-1 text-xs btn-secondary py-1 px-2"
                        >
                          <Hash size={11} /> Assign Lab ID
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Lab ID Modal */}
      <Modal open={!!labModal} onClose={() => setLabModal(null)} title="Assign Lab Internal ID" size="sm">
        <form onSubmit={handleAssignLabId} className="space-y-4">
          <p className="text-sm text-gray-500">Sample: <span className="font-mono font-semibold text-gray-800">{labModal?.sample_ref_id}</span></p>
          <Field label="Lab Internal ID" required>
            <input className="input font-mono" required value={labId} onChange={e => setLabId(e.target.value)} placeholder="LAB-2024-001" autoFocus />
          </Field>
          <p className="text-xs text-gray-400">This ID must be unique across all samples in the system.</p>
          <Alert type="error" message={labError} />
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setLabModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={labSaving}>{labSaving ? 'Assigning…' : 'Assign'}</button>
          </div>
        </form>
      </Modal>

      {/* ── BULK ASSIGN MODAL ────────────────────────────────────────────── */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Assign Tests to Chemists" size="xl">
        {bulkResult ? (
          <div className="space-y-4">
            <Alert type="success" message={`Done! ${bulkResult.created} test(s) assigned. ${bulkResult.skipped} skipped (already existed).`} />
            <button className="btn-primary" onClick={() => { setBulkOpen(false); setBulkResult(null); }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleBulkAssign} className="space-y-6">

            {/* ── Sample selection ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm">
                  Select Samples <span className="text-gray-400 font-normal">({selectedCount} of {group.samples.length} selected)</span>
                </h3>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800"
                >
                  {allSelected
                    ? <><Minus size={12} /> Deselect all</>
                    : <><Check size={12} /> Select all</>}
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-[32px_1fr_1fr_2fr] bg-gray-50 border-b border-gray-200 px-3 py-2">
                  <span />
                  <span className="text-xs font-semibold text-gray-500 uppercase">Sample ID</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Lab ID</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Already assigned</span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {group.samples.map(s => {
                    const isChecked = !!selectedSamples[s.id];
                    return (
                      <label key={s.id} className={`grid grid-cols-[32px_1fr_1fr_2fr] items-center px-3 py-2.5 cursor-pointer transition-colors ${isChecked ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSample(s.id)}
                          className="accent-brand-600 w-4 h-4"
                        />
                        <span className="font-mono text-sm font-semibold text-gray-800">{s.sample_ref_id}</span>
                        <span className="font-mono text-xs text-blue-600">{s.lab_internal_id || '—'}</span>
                        <div className="flex flex-wrap gap-1">
                          {(s.assigned_tests || []).length === 0
                            ? <span className="text-xs text-gray-300">none</span>
                            : (s.assigned_tests || []).map(t => (
                              <span key={t.test_id} className="badge bg-gray-100 text-gray-500 text-xs">{t.test_name}</span>
                            ))}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Test + Chemist assignments ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm">Test Assignments</h3>
                <button type="button" onClick={addAssignmentRow} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                  + Add another test
                </button>
              </div>
              <div className="space-y-2">
                {assignments.map((row, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{i + 1}.</span>
                    <div className="flex-1">
                      <label className="label mb-1">Test Parameter</label>
                      <select
                        className="input text-sm"
                        value={row.test_definition_id}
                        onChange={e => updateAssignment(i, 'test_definition_id', e.target.value)}
                      >
                        <option value="">— Select test —</option>
                        {availableTests(i).map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.unit || 'no unit'})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="label mb-1">Assign to Chemist</label>
                      <select
                        className="input text-sm"
                        value={row.assigned_chemist_id}
                        onChange={e => updateAssignment(i, 'assigned_chemist_id', e.target.value)}
                      >
                        <option value="">— Select chemist —</option>
                        {chemists.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                        ))}
                      </select>
                    </div>
                    {assignments.length > 1 && (
                      <button type="button" onClick={() => removeAssignmentRow(i)} className="mt-5 p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Tests already assigned to a sample will be skipped automatically.
              </p>
            </div>

            <Alert type="error" message={bulkError} />

            <div className="flex justify-between items-center pt-1 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Assigning <strong>{assignments.filter(a => a.test_definition_id && a.assigned_chemist_id).length}</strong> test(s) to <strong>{selectedCount}</strong> sample(s)
              </p>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setBulkOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={bulkSaving}>
                  <FlaskConical size={14} /> {bulkSaving ? 'Assigning…' : 'Assign Tests'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
