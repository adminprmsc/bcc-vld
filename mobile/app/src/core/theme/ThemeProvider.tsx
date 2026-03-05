import { ReactNode, useMemo } from 'react';
import { Appearance, StatusBar, StyleSheet, View } from 'react-native';
import { ThemeContext, defaultTheme, Theme, lightTheme, darkTheme } from './themes';

interface Props {
  children: ReactNode;
  colorScheme?: 'light' | 'dark' | null;
}

export default function ThemeProvider({ children, colorScheme }: Props) {
  const resolved = colorScheme ?? Appearance.getColorScheme();

  const themeValue: Theme = useMemo(() => {
    if (resolved === 'dark') {
      return darkTheme;
    }
    return lightTheme;
  }, [resolved]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.container, { backgroundColor: themeValue.colors.background }]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
