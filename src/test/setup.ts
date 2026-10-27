import "@testing-library/jest-dom";

// Node ≥22 define un `localStorage` global experimental que queda en `undefined`
// si no se pasa --localstorage-file, y tapa el que debería aportar jsdom. Lo
// reemplazamos por una implementación en memoria para que zustand/persist y
// cualquier código que lea Web Storage funcionen en los tests.
const createStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(String(key)) ?? null,
    setItem: (key: string, value: string) => {
      data.set(String(key), String(value));
    },
    removeItem: (key: string) => {
      data.delete(String(key));
    },
    clear: () => {
      data.clear();
    },
  };
};

for (const name of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: createStorage(),
  });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
