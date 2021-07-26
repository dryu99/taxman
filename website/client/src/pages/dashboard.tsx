import React, { useEffect, useState } from "react";

interface DashboardPageProps {}

// TODO this would be a lot cleaner if we
//   1. did authorization code grants instead of implicit (have to setup server)
//   2. used nextjs (maybe)

const DashboardPage: React.FC<DashboardPageProps> = ({}) => {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    let [accessToken, tokenType] = [
      fragment.get("access_token"),
      fragment.get("token_type"),
    ];

    // user naved here via discord bot (url has no params)
    if (!accessToken || !tokenType) {
      // check for token
      const tokenDataJSON = localStorage.getItem("DISCORD_TOKEN_DATA");
      if (tokenDataJSON === null) {
        // do oauth workflow if token isn't cached
        window.location.href =
          "https://discord.com/api/oauth2/authorize?client_id=861845717613150258&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fdashboard&response_type=token&scope=identify";
        return;
      }

      const tokenData: { accessToken: string; tokenType: string } =
        JSON.parse(tokenDataJSON);
      accessToken = tokenData.accessToken;
      tokenType = tokenData.tokenType;
    }

    // user naved here via oauth (or trickled down from above blockimpl)

    // cache token TODO we should only do this if localstorage item is null
    const newTokenDataJSON = JSON.stringify({ accessToken, tokenType });
    localStorage.setItem("DISCORD_TOKEN_DATA", newTokenDataJSON);

    // fetch discord data with token
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
