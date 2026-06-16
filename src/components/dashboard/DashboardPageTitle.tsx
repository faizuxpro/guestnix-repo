"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DashboardPageTitle = {
  title: string;
  subtitle?: string;
};

type DashboardPageTitleContextValue = {
  pageTitle: DashboardPageTitle | null;
  setPageTitle: (title: DashboardPageTitle | null) => void;
};

const DashboardPageTitleContext =
  createContext<DashboardPageTitleContextValue | null>(null);

export function DashboardPageTitleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [pageTitle, setPageTitle] = useState<DashboardPageTitle | null>(null);
  const value = useMemo(
    () => ({ pageTitle, setPageTitle }),
    [pageTitle]
  );

  return (
    <DashboardPageTitleContext.Provider value={value}>
      {children}
    </DashboardPageTitleContext.Provider>
  );
}

export function useDashboardPageTitleState() {
  return useContext(DashboardPageTitleContext)?.pageTitle ?? null;
}

export function useDashboardPageTitle(title: DashboardPageTitle | null) {
  const context = useContext(DashboardPageTitleContext);
  const setPageTitle = context?.setPageTitle;

  useEffect(() => {
    if (!setPageTitle) return;

    setPageTitle(title);
    return () => setPageTitle(null);
  }, [setPageTitle, title]);
}
