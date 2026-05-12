import React from "react"

export function Field({ label, error, children, hint }) {
  // Auto-generate id from label for htmlFor association
  const fieldId = label
    ? `f-${label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
    : undefined

  // Try to inject id into the single child input/select
  let kid = children
  try {
    const only = React.Children.only(children)
    if (fieldId && only && !only.props.id) kid = React.cloneElement(only, { id: fieldId })
  } catch { /* multiple children — skip injection */ }

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={fieldId}>
          {label}
          {hint && (
            <abbr title={hint} aria-label={hint}
              style={{ marginLeft: 5, fontSize: '0.82em', cursor: 'help',
                textDecoration: 'underline dotted', color: 'var(--mid)' }}>ℹ</abbr>
          )}
        </label>
      )}
      {kid}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}
