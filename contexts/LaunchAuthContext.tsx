import React from 'react';

/** Latest auth flag for Launch screen to choose Main vs Unauthed after the splash timer. */
export const LaunchAuthContext = React.createContext<{ isAuthenticated: boolean }>({
  isAuthenticated: false,
});
