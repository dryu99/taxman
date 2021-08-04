import React from "react";
import { Switch, Route, Redirect } from "react-router";
import styled from "styled-components";
import { DASHBOARD_PAGE, HOME_PAGE } from "./lib/constants";
import DashboardPage from "./pages/dashboard";
import HomePage from "./pages/home";
import GlobalStyle from "./styles/global-style";
import ThemeProviderWrapper from "./styles/theme-provider";

const PageContainer = styled.div`
  padding: 5em 10vw;
`;

function App() {
  return (
    <ThemeProviderWrapper>
      <GlobalStyle />
      <PageContainer>
        <h1>TaxBot</h1>
        <Switch>
          <Route path={DASHBOARD_PAGE} component={DashboardPage} />
          <Route path={HOME_PAGE} component={HomePage} />
          <Redirect to={HOME_PAGE} />
        </Switch>
      </PageContainer>
    </ThemeProviderWrapper>
  );
}

export default App;
