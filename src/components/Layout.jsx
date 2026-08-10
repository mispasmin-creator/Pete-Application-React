import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Receipt, 
  Users, 
  LogOut, 
  Wallet,
  ShieldCheck,
  UserCheck,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      show: true
    },
    {
      name: 'Create Entry',
      path: '/create-entry',
      icon: PlusCircle,
      show: true
    },
   {
      name: 'Pete Record',
      path: '/pete-record',
      icon: Receipt,
      show: true
    },
    {
      name: 'HOD Approval',
      path: '/hod-approval',
      icon: ShieldCheck,
      show: true
    },
    {
      name: 'Tally Entry',
      path: '/tally-entry',
      icon: FileCheck,
      show: true
    },
    {
      name: 'User Management',
      path: '/user-management',
      icon: Users,
      show: isAdmin
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-5 shrink-0 justify-between">
        <div>
          {/* LOGO */}
          <div className="flex items-center space-x-3 pb-6 border-b border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="Pete Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 tracking-wide">Pete Cash</h1>
              <p className="text-xs text-slate-500 font-medium">Management System</p>
            </div>
          </div>

          {/* USER INFO BADGE */}
          <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {isAdmin ? <ShieldCheck className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="mt-8 space-y-1.5">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium text-sm text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP HEADER */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center">
            <img src="/logo.png" alt="Pete Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-base">Pete Cash</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex justify-around items-center z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.filter(item => item.show).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'text-emerald-600 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
