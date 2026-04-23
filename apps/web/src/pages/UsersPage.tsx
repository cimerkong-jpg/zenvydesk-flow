import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
      header: t('usersPage.user'),
      render: (user) => (
        <div className="cell-primary">
          <div className="cell-title">{user.full_name ?? user.email}</div>
          <div className="cell-subtitle">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('usersPage.role'),
      render: (user) => <span className="badge badge-neutral">{user.role}</span>,
    },
    {
      key: 'status',
      header: t('usersPage.status'),
      render: (user) => <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{user.status}</span>,
    },
    {
      key: 'last_login',
      header: t('usersPage.lastLogin'),
      render: (user) => user.last_login_at ?? t('usersPage.never'),
    },
    {
      key: 'actions',
      header: t('usersPage.actions'),
      render: (user) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => void updateUserRole(user.id, user.role === 'member' ? 'admin' : 'member').then(loadUsers)}>
            {t('usersPage.toggleRole')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => void updateUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active').then(loadUsers)}>
            {t('usersPage.toggleStatus')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => void adminResetPassword(user.id, 'TempPass123!')}>
            {t('usersPage.resetPassword')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('usersPage.title')}
        description={t('usersPage.description')}
        actions={
          <div className="row-actions">
            <button className="btn btn-secondary" onClick={() => void loadUsers()}>
              {t('usersPage.refresh')}
            </button>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              {t('usersPage.createUser')}
            </button>
          </div>
        }
      />

      <div className="card">
        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
          <input className="form-input" placeholder={t('usersPage.searchPlaceholder')} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <select className="form-input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">{t('usersPage.allRoles')}</option>
            <option value="member">{t('usersPage.member')}</option>
            <option value="admin">{t('usersPage.admin')}</option>
            <option value="super_admin">{t('usersPage.superAdmin')}</option>
          </select>
          <select className="form-input" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
            <option value="">{t('usersPage.allStatus')}</option>
            <option value="active">{t('usersPage.active')}</option>
            <option value="inactive">{t('usersPage.inactive')}</option>
            <option value="suspended">{t('usersPage.suspended')}</option>
          </select>
        </div>
      </div>

      <div className="card card-table">
        <DataTable columns={columns} rows={users} getRowKey={(user) => user.id} />
      </div>

      <Modal
        open={open}
        title={t('usersPage.modal.title')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={() => void handleCreate()}>
              {t('usersPage.modal.create')}
            </button>
          </>
        }
      >
        <div className="form-stack">
          <input className="form-input" placeholder={t('usersPage.modal.fullName')} value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
          <input className="form-input" placeholder={t('usersPage.modal.email')} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <input className="form-input" placeholder={t('usersPage.modal.temporaryPassword')} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <select className="form-input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
            <option value="member">{t('usersPage.member')}</option>
            <option value="admin">{t('usersPage.admin')}</option>
            <option value="super_admin">{t('usersPage.superAdmin')}</option>
          </select>
          <select className="form-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="active">{t('usersPage.active')}</option>
            <option value="inactive">{t('usersPage.inactive')}</option>
            <option value="suspended">{t('usersPage.suspended')}</option>
          </select>
          {error ? <div className="form-error">{error}</div> : null}
        </div>
      </Modal>
    </div>
  )
}
