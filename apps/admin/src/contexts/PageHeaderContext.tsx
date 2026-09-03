import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PageHeaderAction = {
  label: string;
  formId: string;
};

type PageHeaderState = {
  title: string | null;
  action: PageHeaderAction | null;
};

type PageHeaderSetters = {
  setTitle: (title: string | null) => void;
  setAction: (action: PageHeaderAction | null) => void;
};

const StateContext = createContext<PageHeaderState>({ title: null, action: null });
const SettersContext = createContext<PageHeaderSetters | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const [action, setAction] = useState<PageHeaderAction | null>(null);
  const state = useMemo(() => ({ title, action }), [title, action]);
  const setters = useMemo(() => ({ setTitle, setAction }), []);
  return (
    <SettersContext.Provider value={setters}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </SettersContext.Provider>
  );
}

export function usePageHeaderState() {
  return useContext(StateContext);
}

/** Override the top-bar title and optional submit button for this page. Cleared on unmount. */
export function usePageHeader(title: string | null, action: PageHeaderAction | null = null) {
  const setters = useContext(SettersContext);
  const label = action?.label ?? null;
  const formId = action?.formId ?? null;
  useEffect(() => {
    if (!setters) return;
    setters.setTitle(title);
    setters.setAction(label && formId ? { label, formId } : null);
    return () => {
      setters.setTitle(null);
      setters.setAction(null);
    };
  }, [setters, title, label, formId]);
}
