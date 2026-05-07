import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { PageSpinner, Badge } from '../components/shared/UI';
import { ClipboardList, Users, Building2, FlaskConical, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ label, value, icon: Icon, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-50 text-brand-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user }      = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (user.role === 'super_admin') {
          const [users, clients] = await Promise.all([api.getUsers(), api.getClients()]);
          setData({ users, clients });
        } else if (user.role === 'admin') {
          const [groups, tests] = await Promise.all([api.getSampleGroups(), api.getTests()]);
          setData({ groups, tests });
        } else if (user.role === 'lab_manager') {
          const [groups, tests] = await Promise.all([api.getSampleGroups(), api.getTests()]);
          setData({ groups, tests });
        } else if (user.role === 'chemist') {
          const tests = await api.getTests();
          setData({ tests });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) return <PageSpinner />;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting()}, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's what's happening in the lab today.
        </p>
      </div>

      {/* Super Admin */}
      {user.role === 'super_admin' && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users"    value={data.users.length}                                          icon={Users}       color="brand" />
            <StatCard label="Clients"        value={data.clients.length}                                        icon={Building2}   color="blue"  />
            <StatCard label="Admins"         value={data.users.filter(u=>u.role==='admin').length}              icon={Users}       color="amber" />
            <StatCard label="Chemists"       value={data.users.filter(u=>u.role==='chemist').length}            icon={FlaskConical} color="green" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Recent Users</h2>
              <div className="space-y-3">
                {data.users.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-brand-700">{u.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.username}</p>
                      </div>
                    </div>
                    <Badge status={u.role} />
                  </div>
                ))}
              </div>
              <Link to="/users" className="mt-4 block text-xs text-brand-600 hover:underline text-center">View all users →</Link>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Clients</h2>
              <div className="space-y-3">
                {data.clients.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.contact_person || 'No contact'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/clients" className="mt-4 block text-xs text-brand-600 hover:underline text-center">Manage clients →</Link>
            </div>
          </div>
        </>
      )}

      {/* Admin */}
      {user.role === 'admin' && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Sample Groups"  value={data.groups.length}                                         icon={ClipboardList} color="brand"  />
            <StatCard label="In Progress"    value={data.groups.filter(g=>g.status==='in_progress').length}     icon={Clock}         color="amber"  />
            <StatCard label="Approved Tests" value={data.tests.length}                                          icon={CheckCircle}   color="green"  />
          </div>
          <RecentGroupsTable groups={data.groups.slice(0, 8)} />
        </>
      )}

      {/* Lab Manager */}
      {user.role === 'lab_manager' && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sample Groups"   value={data.groups.length}                                         icon={ClipboardList} color="brand"  />
            <StatCard label="Pending Tests"   value={data.tests.filter(t=>t.status==='pending').length}          icon={Clock}         color="amber"  />
            <StatCard label="Awaiting Review" value={data.tests.filter(t=>t.status==='submitted').length}        icon={FlaskConical}  color="purple" />
            <StatCard label="Approved"        value={data.tests.filter(t=>t.status==='approved').length}         icon={CheckCircle}   color="green"  />
          </div>
          <RecentGroupsTable groups={data.groups.slice(0, 8)} />
        </>
      )}

      {/* Chemist */}
      {user.role === 'chemist' && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Assigned Tests"  value={data.tests.length}                                          icon={FlaskConical}  color="brand"  />
            <StatCard label="Pending"         value={data.tests.filter(t=>t.status==='pending').length}          icon={Clock}         color="amber"  />
            <StatCard label="Rejected"        value={data.tests.filter(t=>t.status==='rejected').length}         icon={XCircle}       color="red"    />
            <StatCard label="Approved"        value={data.tests.filter(t=>t.status==='approved').length}         icon={CheckCircle}   color="green"  />
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Pending / Rejected Tests</h2>
            <div className="space-y-3">
              {data.tests.filter(t => t.status !== 'approved').slice(0, 6).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.test_name}</p>
                    <p className="text-xs text-gray-400">{t.sample_ref_id} · {t.group_ref_id}</p>
                  </div>
                  <Badge status={t.status} />
                </div>
              ))}
              {data.tests.filter(t => t.status !== 'approved').length === 0 &&
                <p className="text-sm text-gray-400 text-center py-6">All tests up to date!</p>}
            </div>
            <Link to="/my-tests" className="mt-4 block text-xs text-brand-600 hover:underline text-center">View all my tests →</Link>
          </div>
        </>
      )}
    </div>
  );
}

function RecentGroupsTable({ groups }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Recent Sample Groups</h2>
      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{g.group_ref_id}</p>
              <p className="text-xs text-gray-400">{g.client_name} · {g.sample_count} sample(s)</p>
            </div>
            <Badge status={g.status} />
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No sample groups yet.</p>}
      </div>
    </div>
  );
}
