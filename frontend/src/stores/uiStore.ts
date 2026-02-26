import React from 'react';

export function useUIStore() {
  const [density, setDensity] = React.useState<'compact'|'comfortable'>('comfortable');
  function toggleDensity() { setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact')); }
  return { density, toggleDensity };
}

export default useUIStore;
