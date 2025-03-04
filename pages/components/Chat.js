import React, { useState, useRef, useEffect, useCallback } from "react";
import Message from "./Message";
import { ChevronDown, CircleUser } from "lucide-react";
// import "./Chat.module.css";

// Since we're using the same server, we can just use relative paths

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messagesRef = useRef(null);
  const [user, setUser] = useState(null);

  function getBaseUrl() {
    if (typeof window !== "undefined") {
      const url = window.location.origin; // Get full base URL
      const domainParts = new URL(url).hostname.split(".");

      // Find the index of ".app"
      const appIndex = domainParts.indexOf("app");
      if (appIndex !== -1) {
        return `${window.location.protocol}//${domainParts
          .slice(0, appIndex + 1)
          .join(".")}`;
      }

      return url; // Return full origin if ".app" is not found
    }
    return null; // Return null if running on the server
  }

  const handleUserMessage = useCallback(async (userMessage, userData) => {
    if (!userMessage.trim()) return;

    const timestamp = new Date();
    setMessages((prev) => [
      ...prev,
      {
        text: userMessage,
        isAI: false,
        timestamp,
      },
    ]);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const API_URL = getBaseUrl();

      console.log("Sending chat request:", {
        url: `${API_URL}/api/chat`,
        message: userMessage,
        userId: userData?._id,
      });

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message: userMessage, userId: userData?._id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("Chat API error:", {
          status: response.status,
          statusText: response.statusText,
        });
        let errorMessage = "An error occurred while processing your request";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }

        setMessages((prev) => [
          ...prev,
          {
            text: `Error: ${errorMessage}. Please try again later.`,
            isAI: true,
            isError: true,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      setMessages((prev) => [
        ...prev,
        {
          text: "",
          isAI: true,
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value);
        // chunk = JSON.parse(chunk);
        console.log("Received chunk:", chunk);
        console.log("Received chunk: type", typeof chunk);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5).trim();
            if (!data) continue;

            try {
              console.log("Processing SSE data:", data);
              const parsed = JSON.parse(data);

              // Handle different types of messages
              if (parsed.error) {
                console.error("SSE error received:", parsed.error);
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[
                    newMessages.length - 1
                  ].text = `Error: ${parsed.error}`;
                  newMessages[newMessages.length - 1].isError = true;
                  return newMessages;
                });
                break;
              }

              if (parsed.done) {
                // Stream completed successfully
                continue;
              }

              if (parsed.content) {
                aiResponse += parsed.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].text = aiResponse;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE message:", e);
            }
          }
        }
      }

      // Notify parent window about the response
      if (window !== window.parent) {
        window.parent.postMessage(
          {
            type: "CHAT_RESPONSE",
            message: aiResponse,
          },
          "*"
        );
      }
    } catch (error) {
      console.error("Network Error:", error);
      let errorMessage =
        "Network error occurred. Please check your connection and try again.";

      if (error.name === "AbortError") {
        errorMessage = "Request timed out. Please try again.";
      }

      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          isAI: true,
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle iframe messaging
  useEffect(() => {
    const handleMessage = (event) => {
      // Add allowed origins here
      const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];
      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data.type === "CHAT_MESSAGE") {
        handleUserMessage(event.data.message, user);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleUserMessage]);

  // Notify parent window about height changes
  useEffect(() => {
    const updateHeight = () => {
      if (window !== window.parent) {
        window.parent.postMessage(
          {
            type: "CHAT_RESIZE",
            height: chatContainerRef.current?.scrollHeight || 300,
          },
          "*"
        );
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = useCallback(() => {
    if (!messagesRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  }, []);

  useEffect(() => {
    const messagesDiv = messagesRef.current;
    if (messagesDiv) {
      messagesDiv.addEventListener("scroll", handleScroll);
      return () => messagesDiv.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get("token");

      if (token) {
        fetchUserData(token);
      }
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

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      console.log("user api chat", user);

      const userData = await response.json();
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userMessage = input.trim();
    setInput("");
    await handleUserMessage(userMessage, user);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.reload();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="chat-container" ref={chatContainerRef}>
      <div className="chat-header">
        <div className="name-section">
          <CircleUser size={24} color="white" />
          <p className="name-text">{user?.name || ""}</p>
        </div>
        <h1>Larry The Lead Agent</h1>

        <p className="logout" onClick={handleLogout}>
          Logout
        </p>
      </div>
      <div className="messages" ref={messagesRef}>
        {messages.map((message, index) => (
          <Message
            key={index}
            text={message.text}
            isAI={message.isAI}
            isError={message.isError}
            timestamp={message.timestamp}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {showScrollButton && (
        <button
          className="scroll-to-bottom"
          onClick={scrollToBottom}
          title="Scroll to bottom"
        >
          <ChevronDown size={24} color="white" />
        </button>
      )}
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Find me leads in the state of California..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default Chat;
