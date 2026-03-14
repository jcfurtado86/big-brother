export const scheduleIdle = typeof requestIdleCallback === 'function'
  ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
  : (cb) => requestAnimationFrame(cb);
