import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UserRound, Brain } from "lucide-react";
// import "./Message.Module.css";

const Message = ({ text, isAI, isError, timestamp = new Date() }) => {
  const formatTime = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div
      className={`message ${isAI ? "ai" : "user"} ${isError ? "error" : ""}`}
    >
      <div className="message-content">
        <div className="avatar">
          {isAI ? (
            isError ? (
              "⚠️"
            ) : (
              <Brain size={24} />
            )
          ) : (
            <UserRound size={24} />
          )}
        </div>
        <div className="text">
          {isAI ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="markdown-h1" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="markdown-h2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="markdown-h3" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="markdown-ul" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="markdown-ol" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="markdown-li" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="markdown-p" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code className="markdown-code" {...props} />
                ),
                pre: ({ node, ...props }) => (
                  <pre className="markdown-pre" {...props} />
                ),
              }}
            >
              {text || ""}
            </ReactMarkdown>
          ) : (
            text
          )}
        </div>
      </div>
      <div className="timestamp">{formatTime(timestamp)}</div>
    </div>
  );
};

export default Message;
