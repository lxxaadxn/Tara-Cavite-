import React, { createContext, useContext } from 'react';

type AuthRecoveryCtx = {
  endPasswordRecoveryFlow: () => void;
};

const AuthRecoveryContext = createContext<AuthRecoveryCtx>({
  endPasswordRecoveryFlow: () => {},
});

export function AuthRecoveryProvider({
  children,
  endPasswordRecoveryFlow,
}: {
  children: React.ReactNode;
  endPasswordRecoveryFlow: () => void;
}) {
  return (
    <AuthRecoveryContext.Provider value={{ endPasswordRecoveryFlow }}>
      {children}
    </AuthRecoveryContext.Provider>
  );
}

export function useAuthRecovery() {
  return useContext(AuthRecoveryContext);
}
