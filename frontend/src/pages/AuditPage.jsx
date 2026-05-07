import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { Badge, Empty, PageSpinner } from '../components/shared/UI';
import { Shield, Search, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

// Human-readable labels and colours for each action
const ACTION_META = {
  LOGIN:                    { label: 'Login',               color: 'bg-blue-50 text-blue-700'    },
  LOGIN_FAILED:             { label: 'Login Failed',        color: 'bg-red-50 text-red-700'      },
  CREATE_USER:              { label: 'User Created',        color: 'bg-green-50 text-green-700'  },
  UPDATE_USER:              { label: 'User Updated',        color: 'bg-amber-50 text-amber-700'  },
  ACTIVATE_USER:            { label: 'User Activated',      color: 'bg-green-50 text-green-700'  },
  DEACTIVATE_USER:          { label: 'User Deactivated',    color: 'bg-orange-50 text-orange-700'},
  DELETE_USER:              { label: 'User Deleted',        color: 'bg-red-50 text-red-700'      },
  RESET_PASSWORD:           { label: 'Password Reset',      color: 'bg-purple-50 text-purple-700'},
  CREATE_CLIENT:            { label: 'Client Created',      color: 'bg-green-50 text-green-700'  },
  UPDATE_CLIENT:            { label: 'Client Updated',      color: 'bg-amber-50 text-amber-700'  },
  DELETE_CLIENT:            { label: 'Client Deleted',      color: 'bg-red-50 text-red-700'      },
  CREATE_SAMPLE_GROUP:      { label: 'Group Registered',    color: 'bg-blue-50 text-blue-700'    },
  ASSIGN_LAB_ID:            { label: 'Lab ID Assigned',     color: 'bg-teal-50 text-teal-700'    },
  ASSIGN_TEST:              { label: 'Test Assigned',       color: 'bg-indigo-50 text-indigo-700'},
  BULK_ASSIGN_TESTS:        { label: 'Bulk Tests Assigned', color: 'bg-indigo-50 text-indigo-700'},
  SUBMIT_RESULT:            { label: 'Result Submitted',    color: 'bg-purple-50 text-purple-700'},
  APPROVE_TEST:             { label: 'Test Approved',       color: 'bg-green-50 text-green-700'  },
  REJECT_TEST:              { label: 'Test Rejected',       color: 'bg-red-50 text-red-700'      },
  UPLOAD_CALORIMETER_IMAGE: { label: 'Image Uploaded',      color: 'bg-sky-50 text-sky-700'      },
};

const ENTITY_LABEL = {
  auth:         'Auth',
  user:         'User',
  client:       'Client',
  sample_group: 'Sample Group',
  sample:       'Sample',
  sample_test:  'Test',
};

function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { label: action, color: 'bg-gray-100 text-gray-600' };
  return <span className={`badge text-xs font-semibold ${meta.color}`}>{meta.label}</span>;
}

function RoleBadge({ role }) {
  if (!role) return <span className="text-gray-300 text-xs">—</span>;
  const colors = {
    super_admin: 'bg-rose-100 text-rose-700',
    admin:       'bg-orange-100 text-orange-700',
    lab_manager: 'bg-blue-100 text-blue-700',
    chemist:     'bg-teal-100 text-teal-700',
  };
  return <span className={`badge text-xs ${colors[role] || 'bg-gray-100 text-gray-600'}`}>{role.replace('_',' ')}</span>;
}

function DetailPopover({ detail }) {
  const [open, setOpen] = useState(false);
  if (!detail) return <span className="text-gray-300 text-xs">—</span>;
  const entries = Object.entries(typeof detail === 'string' ? JSON.parse(detail) : detail);
  if (!entries.length) return <span className="text-gray-300 text-xs">—</span>;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-brand-600 hover:underline font-medium"
      >
        {open ? 'hide' : 'details'}
      </button>
      {open && (
        <div className="absolute z-10 left-0 mt-1 w-64 bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-xs space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-start gap-2">
              <span className="text-gray-400 shrink-0 w-28 truncate font-medium">{k}</span>
              <span className="text-gray-700 break-all">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Filters
  const [search,      setSearch]      = useState('');
  const [actorId,     setActorId]     = useState('');
  const [action,      setAction]      = useState('');
  const [entityType,  setEntityType]  = useState('');
  const [from,        setFrom]        = useState('');
  const [to,          setTo]          = useState('');
  const [page,        setPage]        = useState(1);
  const limit = 50;

  // Dropdown options
  const [actors,  setActors]  = useState([]);
  const [actions, setActions] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.getAuditLogs({ page, limit, search, actor_id: actorId, action, entity_type: entityType, from, to });
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, actorId, action, entityType, from, to]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([api.getAuditActors(), api.getAuditActions()])
      .then(([a, ac]) => { setActors(a); setActions(ac); })
      .catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  const applyFilter = (setter) => (val) => { setter(val); setPage(1); };

  const exportCSV = () => {
    const headers = ['Timestamp','Actor','Role','Action','Entity Type','Entity','Detail','IP'];
    const rows = logs.map(l => [
      fmtTs(l.created_at), l.actor_name || '', l.actor_role || '',
      l.action, l.entity_type, l.entity_label || '',
      l.detail ? JSON.stringify(l.detail) : '', l.ip_address || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-brand-600" />
            <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          </div>
          <p className="text-sm text-gray-500">
            Complete record of all actions performed in the system.
            {total > 0 && <span className="ml-2 font-medium text-gray-700">{total.toLocaleString()} entries</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportCSV} className="btn-primary" disabled={logs.length === 0}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative xl:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8 text-sm"
              placeholder="Search actor, action, entity…"
              value={search}
              onChange={e => applyFilter(setSearch)(e.target.value)}
            />
          </div>

          {/* Actor filter */}
          <select className="input text-sm" value={actorId} onChange={e => applyFilter(setActorId)(e.target.value)}>
            <option value="">All users</option>
            {actors.map(a => (
              <option key={a.actor_id} value={a.actor_id}>{a.actor_name} ({a.actor_role?.replace('_',' ')})</option>
            ))}
          </select>

          {/* Action filter */}
          <select className="input text-sm" value={action} onChange={e => applyFilter(setAction)(e.target.value)}>
            <option value="">All actions</option>
            {actions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>)}
          </select>

          {/* From date */}
          <input
            type="date"
            className="input text-sm"
            value={from}
            onChange={e => applyFilter(setFrom)(e.target.value)}
          />

          {/* To date */}
          <input
            type="date"
            className="input text-sm"
            value={to}
            onChange={e => applyFilter(setTo)(e.target.value)}
          />
        </div>

        {/* Active filter chips */}
        {(search || actorId || action || entityType || from || to) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {search     && <Chip label={`"${search}"`}   onRemove={() => applyFilter(setSearch)('')} />}
            {actorId    && <Chip label={actors.find(a=>a.actor_id===actorId)?.actor_name || actorId} onRemove={() => applyFilter(setActorId)('')} />}
            {action     && <Chip label={ACTION_META[action]?.label || action} onRemove={() => applyFilter(setAction)('')} />}
            {from       && <Chip label={`From ${from}`} onRemove={() => applyFilter(setFrom)('')} />}
            {to         && <Chip label={`To ${to}`}     onRemove={() => applyFilter(setTo)('')} />}
            <button onClick={() => { setSearch(''); setActorId(''); setAction(''); setEntityType(''); setFrom(''); setTo(''); setPage(1); }}
              className="text-xs text-red-500 hover:text-red-700 font-medium">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
          {error}
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <PageSpinner />
      ) : logs.length === 0 ? (
        <div className="card">
          <Empty message="No audit logs match your filters." icon={Shield} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Timestamp', 'Actor', 'Role', 'Action', 'Entity', 'Label', 'Detail', 'IP'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">
                      {fmtTs(log.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      {log.actor_name
                        ? <div>
                            <p className="text-xs font-medium text-gray-800">{log.actor_name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{log.actor_id?.slice(0,8)}…</p>
                          </div>
                        : <span className="text-gray-300 text-xs italic">System</span>}
                    </td>
                    <td className="px-3 py-2.5"><RoleBadge role={log.actor_role} /></td>
                    <td className="px-3 py-2.5"><ActionBadge action={log.action} /></td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {ENTITY_LABEL[log.entity_type] || log.entity_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[140px]">
                      <span className="text-xs text-gray-700 truncate block" title={log.entity_label}>
                        {log.entity_label || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><DetailPopover detail={log.detail} /></td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {page} of {pages} · {total.toLocaleString()} total entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p-1))}
                  disabled={page === 1}
                  className="btn-secondary py-1 px-2 text-xs disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                </button>
                {/* Page number pills — show up to 7 */}
                {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                  const p = page <= 4 ? i+1 : page + i - 3;
                  if (p < 1 || p > pages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                        p === page ? 'bg-brand-700 text-white' : 'hover:bg-gray-100 text-gray-600'
                      }`}>{p}</button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(pages, p+1))}
                  disabled={page === pages}
                  className="btn-secondary py-1 px-2 text-xs disabled:opacity-40"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-brand-900 ml-0.5">✕</button>
    </span>
  );
}
