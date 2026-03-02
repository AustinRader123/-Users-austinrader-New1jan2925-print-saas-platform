import React from 'react';

export function Input({ className = '', ...props }: React.ComponentProps<'input'>) {
  return <input className={`ops-input ${className}`.trim()} {...props} />;
}

export default Input;
