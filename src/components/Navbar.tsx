'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRightLeft,
  BarChart2,
  LayoutDashboard,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transfer', label: 'New Transfer', icon: ArrowRightLeft },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-gradient-to-r from-brand-900 to-brand-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Banana Club" width={120} height={36} className="h-9 w-auto object-contain" priority />
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(href)
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive('/admin')
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* User menu */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-700/50 rounded-lg">
              <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase">
                {user?.username?.[0]}
              </div>
              <span className="text-white text-sm font-medium">{user?.username}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  user?.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-brand-500/30 text-brand-200'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-brand-200 hover:text-white hover:bg-brand-700 rounded-lg transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-brand-200 hover:text-white p-2"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-brand-900 border-t border-brand-700 px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(href)
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-200 hover:bg-brand-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive('/admin')
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-200 hover:bg-brand-700 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>
          )}
          <div className="pt-2 border-t border-brand-700 mt-2">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase">
                  {user?.username?.[0]}
                </div>
                <span className="text-white text-sm">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="text-brand-200 hover:text-white flex items-center gap-1 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
