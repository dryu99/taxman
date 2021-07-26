import React, { useEffect, useState } from "react";
import styled from "styled-components";
import GlobalStyle from "./styles/global-style";
import ThemeProviderWrapper from "./styles/theme-provider";

const PageContainer = styled.div`
  padding: 5em 10vw;
`;

function App() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const [accessToken, tokenType] = [
      fragment.get("access_token"),
      fragment.get("token_type"),
    ];

    fetch("https://discord.com/api/users/@me", {
      headers: {
        authorization: `${tokenType} ${accessToken}`,
      },
    })
      .then((result) => result.json())
      .then((res) => {
        console.log("hi", res);
        const { username } = res;
        setUsername(username);
      })
      .catch((error) => {
        console.log("You might have ad block on"); // TODO should display this msg in ui
        console.error(error);
      });
  }, []);

  const showName = username.length > 0;

  return (
    <ThemeProviderWrapper>
      <GlobalStyle />
      <PageContainer>
        <div>
          <div>Hoi!</div>
          {showName ? (
            <p>{username}</p>
          ) : (
            <a
              id="login"
              href="https://discord.com/api/oauth2/authorize?client_id=861845717613150258&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2F&response_type=token&scope=identify"
            >
              Identify Yourself
            </a>
          )}
        </div>
      </PageContainer>
    </ThemeProviderWrapper>
  );
}

export default App;
