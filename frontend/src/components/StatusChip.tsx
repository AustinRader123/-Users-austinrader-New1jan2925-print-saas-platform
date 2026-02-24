import React from 'react';

export default function StatusChip({ value }: { value: string }) {
  const colorVar = (v: string) => {
    switch (v) {
      case 'PAID':
      case 'COMPLETED':
      case 'APPROVED':
        return '--approved';
      case 'IN_PRODUCTION':
        return '--production';
      case 'SHIPPED':
        return '--info';
      case 'READY':
        return '--info';
      case 'BLOCKED':
      case 'CANCELLED':
        return '--cancelled';
      case 'APPROVAL_PENDING':
        return '--warning';
      case 'DRAFT':
      default:
        return '--draft';
    }
  };

  const varName = colorVar(value);
  const label = value.replace('_', ' ');
  return (
    <span
      className="badge"
      style={{
        background: 'var(--primary-muted)',
        color: `var(${varName})`,
        borderColor: 'var(--border-default)',
      }}
    >
      {label}
    </span>
  );
}
