let listeners = new Set();

export const openFullscreenOnboarding = () => {
  listeners.forEach((fn) => fn());
};

export const onOpenFullscreenOnboarding = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
