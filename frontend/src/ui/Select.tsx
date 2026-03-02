import React from 'react';

export function Select(props: React.ComponentProps<'select'>) {
  return <select className="ops-select" {...props} />;
}

export default Select;
