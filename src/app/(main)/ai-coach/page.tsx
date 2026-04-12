"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_GREETING =
  "안녕하세요! SME 운동 코치입니다 💪 운동이나 건강에 대해 궁금한 것이 있으면 물어보세요!";

const MAX_CHARS = 200;

export default function AiCoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const history = updatedMessages
        .filter((m) => m !== updatedMessages[0] || m.role === "user")
        .slice(-20);

      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();

      if (res.ok && data.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "오류가 발생했습니다. 다시 시도해주세요.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "네트워크 오류가 발생했습니다. 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Bot size={24} color="#00E676" />
        </div>
        <div>
          <h1 style={styles.headerTitle}>AI 운동 코치</h1>
          <p style={styles.headerSub}>운동, 건강, 식단에 대해 물어보세요</p>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesContainer}>
        <div style={styles.messagesInner}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.messageRow,
                justifyContent:
                  msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div style={styles.avatarBot}>
                  <Bot size={16} color="#00E676" />
                </div>
              )}
              <div
                style={
                  msg.role === "user"
                    ? styles.bubbleUser
                    : styles.bubbleAssistant
                }
              >
                <p style={styles.bubbleText}>{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
              <div style={styles.avatarBot}>
                <Bot size={16} color="#00E676" />
              </div>
              <div style={styles.bubbleAssistant}>
                <div style={styles.typingIndicator}>
                  <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                  <span style={{ ...styles.dot, animationDelay: "200ms" }} />
                  <span style={{ ...styles.dot, animationDelay: "400ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setInput(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            style={styles.input}
            disabled={loading}
            maxLength={MAX_CHARS}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              ...styles.sendButton,
              opacity: !input.trim() || loading ? 0.4 : 1,
              cursor: !input.trim() || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p style={styles.charCount}>
          {input.length}/{MAX_CHARS}
        </p>
      </div>

      {/* Keyframe styles for typing dots */}
      <style>{`
        @keyframes aiCoachDotBounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 60px)",
    maxHeight: "calc(100dvh - 60px)",
    background: "#0A0A0A",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "20px 24px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "#1A1A1A",
  },
  headerIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "20px",
    background: "rgba(0, 230, 118, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#FFFFFF",
    margin: 0,
  },
  headerSub: {
    fontSize: "13px",
    color: "#666666",
    margin: 0,
    marginTop: "2px",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 16px 8px",
  },
  messagesInner: {
    maxWidth: "680px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
  },
  avatarBot: {
    width: "32px",
    height: "32px",
    borderRadius: "20px",
    background: "rgba(0, 230, 118, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleUser: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: "20px 20px 4px 20px",
    background: "#00E676",
    color: "#0A0A0A",
  },
  bubbleAssistant: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: "20px 20px 20px 4px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  bubbleText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  typingIndicator: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
    height: "20px",
    padding: "0 4px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#00E676",
    display: "inline-block",
    animation: "aiCoachDotBounce 1.2s ease-in-out infinite",
  },
  inputArea: {
    padding: "12px 16px 20px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "#1A1A1A",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    maxWidth: "680px",
    margin: "0 auto",
  },
  input: {
    flex: 1,
    padding: "14px 18px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#0A0A0A",
    color: "#FFFFFF",
    fontSize: "14px",
    outline: "none",
  },
  sendButton: {
    width: "48px",
    height: "48px",
    borderRadius: "20px",
    border: "none",
    background: "#00E676",
    color: "#0A0A0A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  charCount: {
    textAlign: "right",
    fontSize: "11px",
    color: "#666666",
    margin: "6px 0 0",
    maxWidth: "680px",
    marginLeft: "auto",
    marginRight: "auto",
  },
};
