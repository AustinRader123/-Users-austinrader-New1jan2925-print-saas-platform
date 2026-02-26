import React from 'react';

export function Checkbox(props: React.ComponentProps<'input'>) {
  return <input type="checkbox" {...props} />;
}

export default Checkbox;
