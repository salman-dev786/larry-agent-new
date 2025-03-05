import React, { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Chat from "./components/Chat";

const AUTH_URL = `/api/auth/clickfunnels`;

function Home() {
  const [token, setToken] = useState();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get("token");

    if (!token) {
      token = localStorage.getItem("accessToken");
    }

    if (token) {
      localStorage.setItem("accessToken", token);
      setToken(token);
      fetchUserData(token);
    } else {
      setToken(null);
    }
  }, []);

  const fetchUserData = async (token) => {
    if (!token) {
      console.error("No access token found!");
      return;
    }

    try {
      const response = await fetch(`/api/user?accessToken=${token}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const userData = await response.json();
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const handleLogin = () => {
    window.location.href = AUTH_URL;
  };

  if (token) {
    return (
      <div className="App">
        <ErrorBoundary>
          <Chat />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome to Larry The Lead Agent</h1>
        <p>Login to continue</p>
        <button onClick={handleLogin} className="login-button">
          Login with ClickFunnels
        </button>
      </div>
    </div>
  );
}

export default Home;
