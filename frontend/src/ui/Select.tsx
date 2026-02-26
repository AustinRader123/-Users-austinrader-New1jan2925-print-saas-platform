import React from 'react';

export function Select(props: React.ComponentProps<'select'>) {
  return <select className="border rounded px-2 py-1" {...props} />;
}

export default Select;
