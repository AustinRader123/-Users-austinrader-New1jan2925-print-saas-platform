import React from 'react';

export function Input(props: React.ComponentProps<'input'>) {
  return <input className="ops-input" {...props} />;
}

export default Input;
