import React from 'react';

/** Latest auth flag for Welcome screen to choose Main vs Auth after the splash timer. */
export const LaunchAuthContext = React.createContext<{ isAuthenticated: boolean }>({
  isAuthenticated: false,
});
