import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import {
  Users as UsersIcon,
  Search,
  RefreshCcw,
  PlusCircle,
  Shield,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type UserRole = "admin" | "moderator" | "viewer";
type UserStatus = "active" | "disabled";

interface User {
  id: number;
  username: string;
  full_name?: string | null;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at?: string | null;
  last_login?: string | null;
}

const roleBadge = (role: UserRole) => {
  if (role === "admin") return "bg-purple-100 text-purple-800";
  if (role === "moderator") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-800";
};

const statusBadge = (status: UserStatus) => {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  return "bg-red-100 text-red-800";
};

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [apiReady, setApiReady] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");

  // pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    full_name: "",
    email: "",
    role: "moderator" as UserRole,
    password: "",
  });

  // confirm delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setApiReady(true);
    try {
      const res = await api.get("/users/");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        setApiReady(false);
        setUsers([]);
      } else {
        alert(err?.response?.data?.detail || "Failed to load users.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    let list = [...users];

    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (statusFilter !== "all") list = list.filter((u) => u.status === statusFilter);

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      list = list.filter((u) => {
        const hay = [u.username, u.full_name || "", u.email || "", u.role, u.status]
          .join(" ")
          .toLowerCase();
        return hay.includes(t);
      });
    }

    list.sort((a, b) => b.id - a.id);
    return list;
  }, [users, roleFilter, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // --- actions (API-ready) ---
  const updateRole = async (userId: number, role: UserRole) => {
    setBusyId(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update role (backend endpoint missing?).");
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (userId: number, status: UserStatus) => {
    setBusyId(userId);
    try {
      await api.patch(`/users/${userId}/status`, { status });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update status (backend endpoint missing?).");
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (userId: number) => {
    const newPass = prompt("Enter a temporary password for this user:");
    if (!newPass || newPass.trim().length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setBusyId(userId);
    try {
      await api.post(`/users/${userId}/reset-password`, { password: newPass.trim() });
      alert("Temporary password set successfully.");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Reset failed (backend endpoint missing?).");
    } finally {
      setBusyId(null);
    }
  };

  const createUser = async () => {
    if (!createForm.username.trim() || !createForm.password.trim()) {
      alert("Username and password are required.");
      return;
    }

    setCreating(true);
    try {
      await api.post("/users/", {
        username: createForm.username.trim(),
        full_name: createForm.full_name.trim() || null,
        email: createForm.email.trim() || null,
        role: createForm.role,
        password: createForm.password.trim(),
      });

      alert("User created successfully!");
      setCreateOpen(false);
      setCreateForm({ username: "", full_name: "", email: "", role: "moderator", password: "" });
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Create failed (backend endpoint missing?).");
    } finally {
      setCreating(false);
    }
  };

  const openDelete = (u: User) => {
    setConfirmUser(u);
    setConfirmOpen(true);
  };

  const deleteUser = async () => {
    if (!confirmUser) return;
    setBusyId(confirmUser.id);
    try {
      await api.delete(`/users/${confirmUser.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== confirmUser.id));
      setConfirmOpen(false);
      setConfirmUser(null);
      alert("User deleted.");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Delete failed (backend endpoint missing?).");
    } finally {
      setBusyId(null);
    }
  };

  // stats
  const total = users.length;
  const admins = users.filter((u) => u.role === "admin").length;
  const active = users.filter((u) => u.status === "active").length;
  const disabled = users.filter((u) => u.status === "disabled").length;

  if (loading) {
    return <div className="p-20 text-center text-xl text-slate-600">Loading users...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <UsersIcon className="w-10 h-10 text-sky-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Users</h1>
            <p className="text-slate-600 mt-1">
              Manage admin accounts and moderation access for the platform.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            <RefreshCcw size={18} />
            Refresh
          </button>

          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
          >
            <PlusCircle size={18} />
            Create User
          </button>
        </div>
      </div>

      {/* API banner */}
      {!apiReady && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-5">
          <p className="font-semibold">Backend users API not available yet.</p>
          <p className="text-sm mt-1">
            The UI is done. When you add backend endpoints like <code>/users/</code>, this page will work automatically.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat title="Total Users" value={String(total)} icon={<UsersIcon size={18} />} />
        <MiniStat title="Admins" value={String(admins)} icon={<Shield size={18} />} />
        <MiniStat title="Active" value={String(active)} icon={<UserCheck size={18} />} />
        <MiniStat title="Disabled" value={String(disabled)} icon={<UserX size={18} />} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search username, name, email, role..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full lg:w-[220px] px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="viewer">Viewer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full lg:w-[220px] px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            User Directory ({filtered.length})
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Assign roles, disable accounts, or reset passwords.
          </p>
        </div>

        {paginated.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No users found for the current filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <Th>ID</Th>
                    <Th>Username</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginated.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <Td>#{u.id}</Td>
                      <Td className="font-medium text-slate-900">{u.username}</Td>
                      <Td>{u.full_name || "—"}</Td>
                      <Td>{u.email || "—"}</Td>

                      <Td>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${roleBadge(u.role)}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </Td>

                      <Td>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadge(u.status)}`}>
                          {u.status.toUpperCase()}
                        </span>
                      </Td>

                      <Td>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                            disabled={busyId === u.id}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                          >
                            <option value="admin">admin</option>
                            <option value="moderator">moderator</option>
                            <option value="viewer">viewer</option>
                          </select>

                          <button
                            onClick={() =>
                              toggleStatus(u.id, u.status === "active" ? "disabled" : "active")
                            }
                            disabled={busyId === u.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition disabled:opacity-50"
                          >
                            {u.status === "active" ? <UserX size={16} /> : <UserCheck size={16} />}
                            {u.status === "active" ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => resetPassword(u.id)}
                            disabled={busyId === u.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition disabled:opacity-50"
                          >
                            <KeyRound size={16} />
                            Reset
                          </button>

                          <button
                            onClick={() => openDelete(u)}
                            disabled={busyId === u.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pager
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              perPage={perPage}
            />
          </>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <ModalShell title="Create User" onClose={() => setCreateOpen(false)}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Field label="Username *">
              <input
                value={createForm.username}
                onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              />
            </Field>

            <Field label="Role">
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              >
                <option value="admin">admin</option>
                <option value="moderator">moderator</option>
                <option value="viewer">viewer</option>
              </select>
            </Field>

            <Field label="Full Name (optional)">
              <input
                value={createForm.full_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              />
            </Field>

            <Field label="Email (optional)">
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              />
            </Field>

            <Field label="Temporary Password *">
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={createUser}
              disabled={creating}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create User"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* Delete confirm */}
      {confirmOpen && confirmUser && (
        <ConfirmDialog
          title="Confirm Delete"
          message={`Delete user "${confirmUser.username}"? This cannot be undone.`}
          dangerText="Delete"
          cancelText="Cancel"
          busy={busyId === confirmUser.id}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmUser(null);
          }}
          onConfirm={deleteUser}
        />
      )}
    </div>
  );
}

/* --- helpers --- */
function MiniStat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-700">{icon}</div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-4 text-sm text-slate-600 ${className}`}>{children}</td>;
}

function Pager({
  page,
  setPage,
  totalPages,
  totalItems,
  perPage,
}: {
  page: number;
  setPage: (n: number) => void;
  totalPages: number;
  totalItems: number;
  perPage: number;
}) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  return (
    <div className="px-8 py-4 border-t border-slate-200 flex items-center justify-between">
      <p className="text-sm text-slate-600">
        Showing {totalItems === 0 ? 0 : start} to {totalItems === 0 ? 0 : end} of {totalItems}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => setPage(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="px-4 py-2 text-sm font-medium">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            Close
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  dangerText,
  cancelText,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  dangerText: string;
  cancelText: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-700">{message}</p>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {busy ? "..." : dangerText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      {children}
    </div>
  );
}
