import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import "../landing-affexch/community/AffiliateCommunityChat.css";

// AFFEXCH support chat — the affiliate's private thread with the admin team.
// Connects to /api/affiliate/support. Replaces the old anonymous community chat.

type SupportMessage = {
  id: string;
  senderRole: "creator" | "admin";
  body: string;
  createdAt: string;
};

function formatAgo(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${Math.round(min)}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
}

export default function CreatorSupportChat({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "creator" | "admin"; body: string; ts: number; self: boolean; pending?: boolean }>
  >([]);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // Initial load + poll every 8s for admin replies.
  useEffect(() => {
    let alive = true;
    const fetchThread = async () => {
      try {
        const r = await fetch("/api/affiliate/support", { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        if (!alive) return;
        setMessages(
          (data.messages ?? []).map((m: SupportMessage) => ({
            id: m.id,
            role: m.senderRole,
            body: m.body,
            ts: new Date(m.createdAt).getTime(),
            self: m.senderRole === "creator",
          })),
        );
      } catch {
        /* network blip — keep what we have */
      }
    };
    fetchThread();
    const iv = setInterval(fetchThread, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");

    const tempId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "creator", body, ts: Date.now(), self: true, pending: true },
    ]);
    setDraft("");

    try {
      const r = await fetch("/api/affiliate/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to send");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { id: data.id, role: "creator", body: data.body, ts: new Date(data.createdAt).getTime(), self: true }
            : m,
        ),
      );
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError(err?.message || "Couldn't send message");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="acc__panel">
      <span className="acc__corner tl" />
      <span className="acc__corner tr" />
      <span className="acc__corner bl" />
      <span className="acc__corner br" />

      <header className="acc__chrome">
        <span className="acc__chrome-dot is-on" />
        <div className="acc__chrome-titles">
          <div className="acc__chrome-channel">AFFEXCH SUPPORT</div>
          <div className="acc__chrome-meta">
            <span className="acc__pulse" /> private · we usually reply within a day
          </div>
        </div>
        {onClose && (
          <button type="button" className="acc__chrome-close" onClick={onClose} aria-label="Close chat">
            <X size={16} strokeWidth={1.8} />
          </button>
        )}
      </header>

      <div className="acc__feed" ref={feedRef}>
        {messages.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "rgba(0,255,231,0.45)",
              fontFamily: "var(--mono)",
              fontSize: "0.75rem",
            }}
          >
            // Ask us anything — billing, payouts, codes, or your account.
          </div>
        ) : (
          messages.map((m) => {
            const label = m.self ? "you" : "support";
            return (
              <article
                key={m.id}
                className={"acc-msg" + (m.self ? " acc-msg--self" : "") + (m.pending ? " acc-msg--pending" : "")}
              >
                <div className="acc-msg__head">
                  <span className="acc-msg__avatar">{m.self ? "ME" : "AX"}</span>
                  <span className="acc-msg__user">@{label}</span>
                  <span className="acc-msg__sep">·</span>
                  <time className="acc-msg__time" dateTime={new Date(m.ts).toISOString()}>
                    {m.pending ? "sending..." : formatAgo((Date.now() - m.ts) / 60_000)}
                  </time>
                </div>
                <p className="acc-msg__text">{m.body}</p>
              </article>
            );
          })
        )}
      </div>

      <form className="acc__compose" onSubmit={handleSend} autoComplete="off">
        <span className="acc__compose-handle">@you</span>
        <input
          type="text"
          inputMode="text"
          className="acc__compose-input"
          placeholder="message the support team..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          spellCheck={false}
          disabled={sending}
        />
        <button type="submit" className="acc__compose-btn" aria-label="Send message" disabled={!draft.trim() || sending}>
          <Send size={14} strokeWidth={1.9} aria-hidden />
          <span>{sending ? "..." : "SEND"}</span>
        </button>
      </form>

      {sendError && (
        <div
          style={{
            padding: "8px 14px",
            fontFamily: "var(--mono)",
            fontSize: "0.7rem",
            color: "var(--hot)",
            borderTop: "1px solid rgba(255,0,102,0.3)",
          }}
        >
          // {sendError}
        </div>
      )}
    </div>
  );
}
