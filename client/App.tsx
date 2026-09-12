import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RouterProvider } from './src/navigation/RouterContext';
import { AppShell } from './src/components/layout/AppShell';

function MainApp() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppShell />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <MainApp />
      </RouterProvider>
    </ThemeProvider>
  );
}
