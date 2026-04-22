import { useState } from 'react'
import { createProduct, fetchProducts, type Product } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState } from '../components/LoadingState'
import { DataTable, type Column } from '../components/DataTable'
import { useToast } from '../components/Toast'
import { formatRelative, truncate } from '../lib/format'

export function ProductsPage() {
  const toast = useToast()
  const products = useAsync(fetchProducts, [])
  const [showCreate, setShowCreate] = useState(false)

  const columns: Column<Product>[] = [
    {
      key: 'image',
      header: '',
      width: '72px',
      render: (row) =>
        row.image_url ? (
          <img src={row.image_url} alt={row.name} className="product-thumb" />
        ) : (
          <div className="product-thumb product-thumb-placeholder">🛍️</div>
        ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{row.name}</div>
          {row.description && (
            <div className="cell-subtitle text-muted text-sm">
              {truncate(row.description, 120)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      width: '120px',
      render: (row) => <span>{row.price ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'created',
      header: 'Created',
      width: '140px',
      render: (row) => formatRelative(row.created_at),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Products"
        description="Catalog of products you can attach to drafts and automations."
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Product
          </button>
        }
      />

      {products.loading ? (
        <LoadingState />
      ) : products.error ? (
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          <div className="alert-content">
            <div className="alert-title">Failed to load products</div>
            <div className="alert-message">{products.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={products.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No products yet"
            emptyDescription="Add products to link them with drafts and automations."
            emptyAction={
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
              >
                + Create Product
              </button>
            }
          />
        </div>
      )}

      <CreateProductModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false)
          products.refresh()
          toast.success('Product created')
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  )
}

function CreateProductModal({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setDescription('')
    setPrice('')
    setImageUrl('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      onError('Name is required.')
      return
    }
    setSubmitting(true)
    try {
      await createProduct({
        name: name.trim(),
        description: description.trim() || null,
        price: price.trim() || null,
        image_url: imageUrl.trim() || null,
      })
      reset()
      onCreated()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="New Product"
      description="Add a product to your catalog."
      size="lg"
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset()
              onClose()
            }}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Creating…' : 'Create Product'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Premium Widget"
        />
        <FormField
          label="Description"
          as="textarea"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description for the product"
        />
        <FormField
          label="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 19.99 USD"
          hint="Freeform text — include currency if needed."
        />
        <FormField
          label="Image URL"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>
    </Modal>
  )
}
