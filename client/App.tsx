import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RouterProvider } from './src/navigation/RouterContext';
import { AuthProvider } from './src/context/AuthContext';
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
      <AuthProvider>
        <RouterProvider>
          <MainApp />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
