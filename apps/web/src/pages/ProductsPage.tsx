import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTable, type Column } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useAsync } from '../hooks/useAsync'
import { formatRelative, truncate } from '../lib/format'
import { createProduct, deleteProduct, fetchProducts, type Product, updateProduct } from '../lib/api'

export function ProductsPage() {
  const { t } = useTranslation()
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
        row.image_url ? <img src={row.image_url} alt={row.name} className="product-thumb" /> : <div className="product-thumb product-thumb-placeholder">IMG</div>,
    },
    {
      key: 'name',
      header: t('productsPage.table.name'),
      render: (row) => (
        <div className="cell-primary">
          <div className="cell-title">{row.name}</div>
          {row.description ? <div className="cell-subtitle text-muted text-sm">{truncate(row.description, 120)}</div> : null}
        </div>
      ),
    },
    {
      key: 'price',
      header: t('productsPage.table.price'),
      width: '120px',
      render: (row) => <span>{row.price ?? '-'}</span>,
    },
    {
      key: 'status',
      header: t('productsPage.table.status'),
      width: '120px',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
    {
      key: 'created',
      header: t('productsPage.table.created'),
      width: '140px',
      render: (row) => formatRelative(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (row) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setEditingProduct(row)}>
            {t('common.edit')}
          </button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingProduct(row)}>
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('productsPage.title')}
        description={t('productsPage.description')}
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('productsPage.newProduct')}
          </button>
        }
      />

      {products.loading ? (
        <LoadingState />
      ) : products.error ? (
        <div className="alert alert-error">
          <div className="alert-content">
            <div className="alert-title">{t('productsPage.failedLoad')}</div>
            <div className="alert-message">{products.error}</div>
          </div>
        </div>
      ) : (
        <div className="card card-table">
          <DataTable
            columns={columns}
            rows={products.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle={t('productsPage.emptyTitle')}
            emptyDescription={t('productsPage.emptyDescription')}
            emptyAction={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                {t('productsPage.createProduct')}
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
          toast.success(t('productsPage.created'))
        }}
        onError={(message) => toast.error(message)}
      />

      <ProductFormModal
        open={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSuccess={() => {
          setEditingProduct(null)
          products.refresh()
          toast.success(t('productsPage.updated'))
        }}
        onError={(message) => toast.error(message)}
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
            toast.success(t('productsPage.deleted'))
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
  const { t } = useTranslation()
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
  }, [open, product])

  const reset = () => {
    setName('')
    setDescription('')
    setPrice('')
    setImageUrl('')
    setImagePreview('')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError(t('productsPage.form.selectImage'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      onError(t('productsPage.form.imageTooLarge'))
      return
    }
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
      onError(t('productsPage.form.nameRequired'))
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: price.trim() || null,
        image_url: imageUrl.trim() || null,
      }
      if (isEdit && product) {
        await updateProduct(product.id, payload)
      } else {
        await createProduct(payload)
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
      title={isEdit ? t('productsPage.form.editTitle') : t('productsPage.form.newTitle')}
      description={isEdit ? t('productsPage.form.editDescription') : t('productsPage.form.newDescription')}
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
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? (isEdit ? t('productsPage.form.updating') : t('productsPage.form.creating')) : isEdit ? t('productsPage.form.update') : t('productsPage.form.create')}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <FormField
          label={t('productsPage.form.name')}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('productsPage.form.namePlaceholder')}
        />
        <FormField
          label={t('productsPage.form.description')}
          as="textarea"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('productsPage.form.descriptionPlaceholder')}
        />
        <FormField
          label={t('productsPage.form.price')}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder={t('productsPage.form.pricePlaceholder')}
          hint={t('productsPage.form.priceHint')}
        />

        <div className="form-field">
          <label className="form-label">{t('productsPage.form.image')}</label>
          <div className="image-upload-section">
            <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" id="product-image-upload" />
            <label htmlFor="product-image-upload" className="btn btn-secondary btn-sm">
              {t('productsPage.form.chooseImage')}
            </label>
            <span className="text-sm text-muted" style={{ marginLeft: '12px' }}>
              {t('productsPage.form.imageUploadHint')}
            </span>
          </div>

          {imagePreview ? (
            <div className="image-preview" style={{ marginTop: '12px' }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
            </div>
          ) : null}

          <FormField
            label={t('productsPage.form.imageUrl')}
            type="url"
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(event) => {
              setImageUrl(event.target.value)
              setImagePreview(event.target.value)
            }}
            placeholder={t('productsPage.form.imageUrlPlaceholder')}
            hint={t('productsPage.form.imageHint')}
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
  const { t } = useTranslation()
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
      title={t('productsPage.deleteModal.title')}
      description={t('productsPage.deleteModal.description')}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? t('productsPage.deleteModal.deleting') : t('productsPage.deleteModal.confirm')}
          </button>
        </>
      }
    >
      <p>{t('productsPage.deleteModal.question', { name: productName })}</p>
    </Modal>
  )
}
