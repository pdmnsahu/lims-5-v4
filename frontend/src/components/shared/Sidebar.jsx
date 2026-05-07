import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, Building2, FlaskConical,
  ClipboardList, FileCheck, LogOut, ChevronRight, Beaker, Shield
} from 'lucide-react';

const roleNav = {
  super_admin: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'         },
    { to: '/users',        icon: Users,           label: 'Users'             },
    { to: '/clients',      icon: Building2,       label: 'Clients'           },
    { to: '/all-groups',   icon: ClipboardList,   label: 'All Sample Groups' },
    { to: '/all-tests',    icon: FileCheck,       label: 'All Tests'         },
    { to: '/audit',        icon: Shield,          label: 'Audit Trail'       },
  ],
  admin: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/sample-groups',icon: ClipboardList,   label: 'Sample Groups'},
    { to: '/reports',      icon: FileCheck,       label: 'Reports'      },
  ],
  lab_manager: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/sample-groups',icon: ClipboardList,   label: 'Sample Groups'},
    { to: '/review-tests', icon: FileCheck,       label: 'Review Tests' },
  ],
  chemist: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-tests',     icon: Beaker,          label: 'My Tests'  },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = roleNav[user?.role] || [];
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center">
            <FlaskConical size={16} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-gray-900 leading-none text-base">CoalLIMS</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Lab Management</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand-700">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-400 truncate font-mono">{user?.username}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
              ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="text-brand-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
