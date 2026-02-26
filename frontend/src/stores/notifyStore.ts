export function notify(_msg: string, _level: 'info'|'warning'|'danger' = 'info') {
  // noop in build/test environment
  return null;
}

export default notify;
