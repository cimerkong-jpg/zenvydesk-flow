import { useEffect, useState } from 'react'
import { createProduct, updateProduct, deleteProduct, fetchProducts, type Product } from '../lib/api'
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

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
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (row) => (
        <div className="row-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditingProduct(row)}
          >
            Edit
          </button>
          <button
            className="btn btn-ghost btn-sm text-danger"
            onClick={() => setDeletingProduct(row)}
          >
            Delete
          </button>
        </div>
      ),
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

      <ProductFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          products.refresh()
          toast.success('Product created')
        }}
        onError={(msg) => toast.error(msg)}
      />

      <ProductFormModal
        open={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSuccess={() => {
          setEditingProduct(null)
          products.refresh()
          toast.success('Product updated')
        }}
        onError={(msg) => toast.error(msg)}
      />

      <DeleteConfirmModal
        open={!!deletingProduct}
        productName={deletingProduct?.name ?? ''}
        onClose={() => setDeletingProduct(null)}
        onConfirm={async () => {
          if (!deletingProduct) return
          try {
            await deleteProduct(deletingProduct.id)
            setDeletingProduct(null)
            products.refresh()
            toast.success('Product deleted')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err))
          }
        }}
      />
    </div>
  )
}

function ProductFormModal({
  open,
  product,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean
  product?: Product | null
  onClose: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const isEdit = !!product
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product?.price ?? '')
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(product?.name ?? '')
    setDescription(product?.description ?? '')
    setPrice(product?.price ?? '')
    setImageUrl(product?.image_url ?? '')
    setImagePreview(product?.image_url ?? '')
  }, [product, open])

  const reset = () => {
    setName('')
    setDescription('')
    setPrice('')
    setImageUrl('')
    setImagePreview('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      onError('Image size must be less than 2MB')
      return
    }

    // Convert to base64 for preview and storage
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setImageUrl(base64)
      setImagePreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      onError('Name is required.')
      return
    }
    setSubmitting(true)
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
        price: price.trim() || null,
        image_url: imageUrl.trim() || null,
      }
      
      if (isEdit && product) {
        await updateProduct(product.id, input)
      } else {
        await createProduct(input)
      }
      
      reset()
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Product' : 'New Product'}
      description={isEdit ? 'Update product details.' : 'Add a product to your catalog.'}
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
            {submitting ? (isEdit ? 'Updating…' : 'Creating…') : (isEdit ? 'Update Product' : 'Create Product')}
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
        
        <div className="form-field">
          <label className="form-label">Product Image</label>
          <div className="image-upload-section">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
              id="product-image-upload"
            />
            <label htmlFor="product-image-upload" className="btn btn-secondary btn-sm">
              📁 Choose Image
            </label>
            <span className="text-sm text-muted" style={{ marginLeft: '12px' }}>
              or enter URL below (max 2MB)
            </span>
          </div>
          
          {imagePreview && (
            <div className="image-preview" style={{ marginTop: '12px' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '200px', 
                  maxHeight: '200px', 
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }} 
              />
            </div>
          )}
          
          <FormField
            label="Or Image URL"
            type="url"
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value)
              setImagePreview(e.target.value)
            }}
            placeholder="https://example.com/image.jpg"
            hint="Leave empty if uploading file above"
            style={{ marginTop: '12px' }}
          />
        </div>
      </div>
    </Modal>
  )
}

function DeleteConfirmModal({
  open,
  productName,
  onClose,
  onConfirm,
}: {
  open: boolean
  productName: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Delete Product"
      description="This action cannot be undone."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete Product'}
          </button>
        </>
      }
    >
      <p>
        Are you sure you want to delete <strong>{productName}</strong>?
      </p>
    </Modal>
  )
}
