import { useWindowDimensions } from 'react-native';

export interface Breakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export function useBreakpoint(): Breakpoints {
  const { width, height } = useWindowDimensions();

  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
    height,
  };
}
