import React, { createContext, useContext, useMemo, useState } from "react";
import { createTheme, theme as defaultTheme } from "./theme";

const ThemeContext = createContext({
  mode: "light",
  theme: defaultTheme,
  setMode: () => {},
});

export const ThemeProvider = ({ initialMode = "light", app = null, children }) => {
  const [mode, setMode] = useState(initialMode);
  const value = useMemo(
    () => ({ mode, theme: createTheme(mode, app), setMode }),
    [mode, app],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
