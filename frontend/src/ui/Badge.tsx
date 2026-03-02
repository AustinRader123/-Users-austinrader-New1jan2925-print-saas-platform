import React from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger';

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: React.ComponentProps<'span'> & { tone?: BadgeTone }) {
  return <span className={`ops-badge ops-badge-${tone} ${className}`.trim()} {...props} />;
}

export default Badge;
