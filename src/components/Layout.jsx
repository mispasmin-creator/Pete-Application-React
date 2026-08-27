import React, { useState } from 'react';
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
  FileCheck,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, role, isAdmin, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  
   const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      show: hasPermission ? hasPermission('/') : true
    },
    {
      name: 'Create Entry',
      path: '/create-entry',
      icon: PlusCircle,
      show: hasPermission ? hasPermission('/create-entry') : true
    },
    {
      name: 'Pete Record',
      path: '/pete-record',
      icon: Receipt,
      show: hasPermission ? hasPermission('/pete-record') : true
    },
    {
      name: 'HOD Approval',
      path: '/hod-approval',
      icon: ShieldCheck,
      show: hasPermission ? hasPermission('/hod-approval') : (isAdmin || role === 'HOD')
    },
    {
      name: 'Tally Entry',
      path: '/tally-entry',
      icon: FileCheck,
      show: hasPermission ? hasPermission('/tally-entry') : isAdmin
    },
    {
      name: 'User Management',
      path: '/user-management',
      icon: Users,
      show: hasPermission ? hasPermission('/user-management') : isAdmin
    }
  ];
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans">
      {/* DESKTOP & TABLET SIDEBAR */}
      <aside className="hidden md:flex flex-col md:w-56 lg:w-64 h-full bg-white border-r border-slate-200 p-4 lg:p-5 shrink-0 justify-between overflow-y-auto">
        <div>
          {/* LOGO */}
          <div className="flex items-center space-x-3 pb-5 border-b border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shadow-sm shrink-0">
              <img src="/logo.png" alt="Pete Logo" className="w-full h-full object-contain" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-base lg:text-lg text-slate-900 tracking-wide truncate">Pete Cash</h1>
              <p className="text-[11px] text-slate-500 font-medium truncate">Management System</p>
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="mt-6 space-y-1.5">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-3 rounded-xl font-medium text-xs lg:text-sm transition-all duration-200 min-h-[44px] ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* USER INFO BADGE + LOGOUT BUTTON */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-md shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  isAdmin ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' : 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                }`}>
                  {isAdmin ? <ShieldCheck className="w-2.5 h-2.5 mr-1" /> : <UserCheck className="w-2.5 h-2.5 mr-1" />}
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-xs lg:text-sm text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP HEADER WITH HAMBURGER BUTTON */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm min-h-[52px]">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Open Drawer Menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Pete Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-base">Pete Cash</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MOBILE HAMBURGER MENU DRAWER */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileDrawerOpen(false)} 
          />

          {/* Slide-out Panel */}
          <div className="relative flex flex-col w-72 max-w-[80vw] bg-white h-full p-5 shadow-2xl z-10 justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center">
                    <img src="/logo.png" alt="Pete Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-slate-900">Pete Cash</h2>
                    <p className="text-[10px] text-slate-500">Menu Navigation</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="mt-6 space-y-1.5">
                {navItems.filter(item => item.show).map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-xs transition-all min-h-[44px] ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-md'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* User Badge + Logout */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-semibold text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors min-h-[44px]"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 pb-8 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
