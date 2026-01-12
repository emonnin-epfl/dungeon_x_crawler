export const createPubSub = <T extends Record<string, (...args: any[]) => void>>() => {
  const eventMap = {} as Record<keyof T, Set<(...args: any[]) => void>>;

  return {
    emit: <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => {
      (eventMap[event] ?? []).forEach((cb) => cb(...args));
    },

    on: <K extends keyof T>(event: K, callback: T[K]) => {
      if (!eventMap[event]) {
        eventMap[event] = new Set();
      }

      eventMap[event].add(callback);
    },

    off: <K extends keyof T>(event: K, callback: T[K]) => {
      if (!eventMap[event]) {
        return;
      }

      eventMap[event].delete(callback);
    },
  };
};