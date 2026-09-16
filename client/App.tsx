import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RouterProvider } from './src/navigation/RouterContext';
import { AuthProvider } from './src/context/AuthContext';
import { AppShell } from './src/components/layout/AppShell';

function MainApp() {
  const { mode } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontLinkId = 'vercel-geist-fonts';
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement('link');
        link.id = fontLinkId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

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
