'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Edit2, Trash2, CheckCircle, AlertCircle, X,
  Eye, EyeOff, Settings, ShieldCheck, User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api';
import { User } from '@/types';
import { format } from 'date-fns';

interface CreateForm {
  username: string;
  password: string;
  role: 'admin' | 'user';
}

interface EditForm {
  password: string;
  role: 'admin' | 'user';
  is_active: boolean;
}

export default function AdminPage() {
  const { user: currentUser, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ username: '', password: '', role: 'user' });
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ password: '', role: 'user', is_active: true });
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    loadUsers();
  }, [currentUser, router]);

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getUsers(token);
      setUsers(data);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreateLoading(true);
    try {
      const newUser = await createUser(token, createForm);
      setUsers((prev) => [newUser, ...prev]);
      setShowCreate(false);
      setCreateForm({ username: '', password: '', role: 'user' });
      flash(`User "${newUser.username}" created successfully.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to create user.', true);
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ password: '', role: u.role, is_active: u.is_active ?? true });
    setShowEditPwd(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editUser) return;
    setEditLoading(true);
    const payload: { password?: string; role?: string; is_active?: boolean } = {
      role: editForm.role,
      is_active: editForm.is_active,
    };
    if (editForm.password) payload.password = editForm.password;
    try {
      const updated = await updateUser(token, editUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditUser(null);
      flash(`User "${updated.username}" updated.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to update user.', true);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!token) return;
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(token, u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      flash(`User "${u.username}" deleted.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to delete user.', true);
    }
  };

  if (currentUser?.role !== 'admin') return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
            <p className="text-slate-500 text-sm">Manage system users and credentials</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 mb-5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 p-3 mb-5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800">System Users ({users.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading users…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-bold uppercase">
                          {u.username[0]}
                        </div>
                        <span className="font-medium text-slate-800">{u.username}</span>
                        {u.id === currentUser?.id && (
                          <span className="text-xs text-slate-400">(you)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="badge-admin flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="badge-user flex items-center gap-1 w-fit">
                          <UserIcon className="w-3 h-3" /> User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active !== false ? (
                        <span className="badge-active">Active</span>
                      ) : (
                        <span className="badge-inactive">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id === currentUser?.id}
                          className="btn-danger px-3 py-1.5 text-xs disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800 text-lg">Create New User</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="e.g. store_user1"
                  className="input-field"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePwd ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="input-field pr-11"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePwd(!showCreatePwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCreatePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'admin' | 'user' })}
                  className="select-field"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading} className="btn-primary flex-1 justify-center">
                  {createLoading ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800 text-lg">Edit User: {editUser.username}</h3>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="label">New Password <span className="text-slate-400 font-normal normal-case">(leave blank to keep)</span></label>
                <div className="relative">
                  <input
                    type={showEditPwd ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter new password…"
                    className="input-field pr-11"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPwd(!showEditPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                  className="select-field"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Account Status</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_active: true })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      editForm.is_active
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_active: false })}
                    disabled={editUser.id === currentUser?.id}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-30 ${
                      !editForm.is_active
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="btn-primary flex-1 justify-center">
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
