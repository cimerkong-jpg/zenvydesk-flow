import { useEffect, useState } from 'react'

import { DataTable, type Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import {
  adminResetPassword,
  createUser,
  fetchUsers,
  type AuthUser,
  updateUserRole,
  updateUserStatus,
} from '../lib/api'


type UserForm = {
  email: string
  password: string
  full_name: string
  role: string
  status: string
}


const defaultForm: UserForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'member',
  status: 'active',
}


export function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<UserForm>(defaultForm)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = async () => {
    const result = await fetchUsers({ keyword, role, status: statusValue })
    setUsers(result.items)
  }

  useEffect(() => {
    void loadUsers()
  }, [keyword, role, statusValue])

  const handleCreate = async () => {
    setError(null)
    try {
      await createUser(form)
      setOpen(false)
      setForm(defaultForm)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const columns: Column<AuthUser>[] = [
    {
      key: 'identity',
      header: 'User',
      render: (user) => (
        <div className="cell-primary">
          <div className="cell-title">{user.full_name ?? user.email}</div>
          <div className="cell-subtitle">{user.email}</div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (user) => <span className="badge badge-neutral">{user.role}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (user) => <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{user.status}</span>,
    },
    { key: 'last_login', header: 'Last login', render: (user) => user.last_login_at ?? 'Never' },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => void updateUserRole(user.id, user.role === 'member' ? 'admin' : 'member').then(loadUsers)}>
            Toggle role
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => void updateUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active').then(loadUsers)}>
            Toggle status
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => void adminResetPassword(user.id, 'TempPass123!')}>
            Reset password
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Users"
        description="Manage app accounts, roles, and status."
        actions={
          <div className="row-actions">
            <button className="btn btn-secondary" onClick={() => void loadUsers()}>
              Refresh
            </button>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              Create user
            </button>
          </div>
        }
      />

      <div className="card">
        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
          <input className="form-input" placeholder="Search by name or email" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <select className="form-input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">All roles</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
          <select className="form-input" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="card card-table">
        <DataTable columns={columns} rows={users} getRowKey={(user) => user.id} />
      </div>

      <Modal
        open={open}
        title="Create user"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void handleCreate()}>
              Create
            </button>
          </>
        }
      >
        <div className="form-stack">
          <input className="form-input" placeholder="Full name" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
          <input className="form-input" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <input className="form-input" placeholder="Temporary password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <select className="form-input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
          <select className="form-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          {error ? <div className="form-error">{error}</div> : null}
        </div>
      </Modal>
    </div>
  )
}
