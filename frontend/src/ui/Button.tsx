import React from 'react';

type ButtonVariant = 'default' | 'primary' | 'ghost';

export function Button({
  variant = 'default',
  className = '',
  ...props
}: React.ComponentProps<'button'> & { variant?: ButtonVariant }) {
  const variantClass =
    variant === 'primary' ? 'ops-btn-primary' : variant === 'ghost' ? 'ops-btn-ghost' : 'ops-btn-default';
  return <button className={`ops-btn ${variantClass} ${className}`.trim()} {...props} />;
}

export default Button;
