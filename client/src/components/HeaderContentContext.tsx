import React, { createContext, useContext, useState } from "react";

interface HeaderContentContextValue {
  headerContent: React.ReactNode;
  setHeaderContent: (content: React.ReactNode) => void;
}

const HeaderContentContext = createContext<HeaderContentContextValue | undefined>(undefined);

export function HeaderContentProvider({ children }: { children: React.ReactNode }) {
  const [headerContent, setHeaderContent] = useState<React.ReactNode>(null);

  return (
    <HeaderContentContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </HeaderContentContext.Provider>
  );
}

export function useHeaderContent() {
  const context = useContext(HeaderContentContext);
  if (!context) {
    throw new Error("useHeaderContent must be used within a HeaderContentProvider");
  }
  return context;
}
