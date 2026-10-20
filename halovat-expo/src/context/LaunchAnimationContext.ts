import { createContext, useContext } from 'react';

export const LaunchAnimationContext = createContext(false);
export const useAppLoading = () => useContext(LaunchAnimationContext);
