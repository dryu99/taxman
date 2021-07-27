import React, { useEffect, useState } from "react";

interface TokenData {
  accessToken: string;
  tokenType: string;
}

const TOKEN_DATA_CACHE_KEY = "discord_token_data";

const getTokenData = (): TokenData | undefined => {
  // check url params
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = fragment.get("access_token");
  const tokenType = fragment.get("token_type");
  if (accessToken && tokenType) return { accessToken, tokenType };

  // check browser cache
  const cachedTokenDataJSON = localStorage.getItem(TOKEN_DATA_CACHE_KEY);
  if (cachedTokenDataJSON) {
    const cachedTokenData: TokenData = JSON.parse(cachedTokenDataJSON);
    return { ...cachedTokenData };
  }

  return undefined;
};

interface DashboardPageProps {}

// TODO this would be a lot cleaner if we
//   1. did authorization code grants instead of implicit (have to setup server)
//        - actually it prob looks the same, just with codes instead of tokens lol
//   2. used nextjs (maybe)
//        - could just use loader for now while additional network reqs are being made

const DashboardPage: React.FC<DashboardPageProps> = ({}) => {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const tokenData = getTokenData();
    if (!tokenData) {
      window.location.href =
        "https://discord.com/api/oauth2/authorize?client_id=861845717613150258&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fdashboard&response_type=token&scope=identify";
      return;
    }

    // cache token
    localStorage.setItem(TOKEN_DATA_CACHE_KEY, JSON.stringify(tokenData));

    // fetch discord data
    const { accessToken, tokenType } = tokenData;
    fetch("https://discord.com/api/users/@me", {
      headers: {
        authorization: `${tokenType} ${accessToken}`,
      },
    })
      .then((result) => result.json())
      .then((res) => {
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
    <div>
      <h2>Dashboard</h2>
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
  );
};

export default DashboardPage;
