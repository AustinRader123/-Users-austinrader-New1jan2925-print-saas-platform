import React from 'react';

export function Input(props: React.ComponentProps<'input'>) {
  return <input className="border rounded px-2 py-1" {...props} />;
}

export default Input;
