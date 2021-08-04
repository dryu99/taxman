import { createGlobalStyle } from "styled-components";
import { Theme } from "./theme-provider";

const GlobalStyle = createGlobalStyle<{ theme: Theme }>`
  body {
    margin: 0;
    padding: 0;
    font-family: Helvetica;
  }
`;

export default GlobalStyle;
