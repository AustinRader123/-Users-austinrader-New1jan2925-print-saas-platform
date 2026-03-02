import React from 'react';

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  variant = 'default',
  className = '',
  ...props
}: React.ComponentProps<'button'> & { variant?: ButtonVariant }) {
  const variantClass =
    variant === 'primary'
      ? 'ops-btn-primary'
      : variant === 'danger'
      ? 'ops-btn-danger'
      : variant === 'ghost'
      ? 'ops-btn-ghost'
      : variant === 'secondary' || variant === 'default'
      ? 'ops-btn-secondary'
      : 'ops-btn-secondary';
  return <button className={`ops-btn ${variantClass} ${className}`.trim()} {...props} />;
}

export default Button;
