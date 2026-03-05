import { createContext } from 'react';

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    warning: string;
    critical: string;
  };
}

export const lightTheme: Theme = {
  colors: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    accent: '#F97316',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    border: '#CBD5F5',
    warning: '#F59E0B',
    critical: '#DC2626'
  }
};

export const darkTheme: Theme = {
  colors: {
    primary: '#60A5FA',
    primaryDark: '#1D4ED8',
    accent: '#FB923C',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#CBD5F5',
    border: '#334155',
    warning: '#FACC15',
    critical: '#F87171'
  }
};

export const defaultTheme = lightTheme;

export const ThemeContext = createContext<Theme>(defaultTheme);
