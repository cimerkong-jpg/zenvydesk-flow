import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'

type BaseProps = {
  label: string
  hint?: string
  error?: string
  required?: boolean
}

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    as?: 'input'
  }

type TextareaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
    as: 'textarea'
  }

type SelectProps = BaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
    as: 'select'
    children: ReactNode
  }

export function FormField(props: InputProps | TextareaProps | SelectProps) {
  const { label, hint, error, required } = props

  const renderControl = () => {
    if (props.as === 'textarea') {
      const { as: _as, label: _label, hint: _hint, error: _error, ...rest } = props
      void _as
      void _label
      void _hint
      void _error
      return <textarea className={`form-control ${error ? 'form-control-error' : ''}`} {...rest} />
    }
    if (props.as === 'select') {
      const { as: _as, label: _label, hint: _hint, error: _error, children, ...rest } = props
      void _as
      void _label
      void _hint
      void _error
      return (
        <select className={`form-control ${error ? 'form-control-error' : ''}`} {...rest}>
          {children}
        </select>
      )
    }
    const { as: _as, label: _label, hint: _hint, error: _error, ...rest } = props as InputProps
    void _as
    void _label
    void _hint
    void _error
    return <input className={`form-control ${error ? 'form-control-error' : ''}`} {...rest} />
  }

  return (
    <label className="form-field">
      <span className="form-label">
        {label}
        {required && <span className="form-required">*</span>}
      </span>
      {renderControl()}
      {error ? (
        <span className="form-error">{error}</span>
      ) : hint ? (
        <span className="form-hint">{hint}</span>
      ) : null}
    </label>
  )
}
