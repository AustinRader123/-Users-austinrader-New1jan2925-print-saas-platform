import React from 'react';

export function Card({ className = '', ...props }: React.ComponentProps<'section'>) {
  return <section className={`ops-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ className = '', ...props }: React.ComponentProps<'div'>) {
  return <div className={`ops-card-header ${className}`.trim()} {...props} />;
}

export function CardBody({ className = '', ...props }: React.ComponentProps<'div'>) {
  return <div className={`ops-card-body ${className}`.trim()} {...props} />;
}

export default Card;
