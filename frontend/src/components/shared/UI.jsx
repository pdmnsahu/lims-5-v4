import { X, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';

// ── Badge ────────────────────────────────────────────────────────────────────
const statusMap = {
  collected:   'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-green-50 text-green-700',
  pending:     'bg-gray-100 text-gray-600',
  submitted:   'bg-purple-50 text-purple-700',
  approved:    'bg-green-50 text-green-700',
  rejected:    'bg-red-50 text-red-700',
  super_admin: 'bg-rose-100 text-rose-800',
  admin:       'bg-orange-100 text-orange-800',
  lab_manager: 'bg-blue-100 text-blue-800',
  chemist:     'bg-teal-100 text-teal-800',
};

export function Badge({ status, label }) {
  const cls = statusMap[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`badge ${cls}`}>
      {label || status?.replace('_', ' ')}
    </span>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ className = '' }) {
  return <Loader2 size={20} className={`animate-spin text-brand-600 ${className}`} />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ message = 'No records found.', icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      {Icon && <Icon size={40} className="mb-3 opacity-40" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Alert ────────────────────────────────────────────────────────────────────
export function Alert({ type = 'error', message }) {
  if (!message) return null;
  const styles = {
    error:   { bg: 'bg-red-50 border-red-200 text-red-700',   Icon: AlertCircle },
    success: { bg: 'bg-green-50 border-green-200 text-green-700', Icon: CheckCircle },
    info:    { bg: 'bg-blue-50 border-blue-200 text-blue-700',  Icon: Info },
  };
  const { bg, Icon } = styles[type];
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${bg}`}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────
export function Table({ headers, children, loading }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading
            ? <tr><td colSpan={headers.length} className="text-center py-12"><Spinner className="mx-auto" /></td></tr>
            : children}
        </tbody>
      </table>
    </div>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────
export function Field({ label, children, required }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-brand-600 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}
