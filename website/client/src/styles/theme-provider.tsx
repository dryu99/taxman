import React from "react";
import { ThemeProvider } from "styled-components";

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
  };
}

const theme: Theme = {
  colors: {
    primary: "#2286f7",
    secondary: "#343a40",
  },
};

const ThemeProviderWrapper: React.FC = ({ children }) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default ThemeProviderWrapper;
