import React from 'react';

export function FormField({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="ops-form-field">
      <span className="ops-form-label">{label}</span>
      {description ? <span className="ops-form-description">{description}</span> : null}
      <div className="ops-form-control">{children}</div>
      {error ? <span className="ops-form-error">{error}</span> : null}
    </label>
  );
}

export default FormField;
