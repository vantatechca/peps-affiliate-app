import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import "./AffiliateCommunityChat.css";

// AFFEXCH community chat — connects to /api/community-chat backend.
// Messages persist in DB across refreshes. Handle stored in localStorage so
// the same browser keeps the same pseudonym across visits.

const HANDLE_KEY = "affexch.community.handle";

const __UNUSED_SEED = [
  {
    id: "s1",
    user: "cryo_max",
    text: "Just hit silver tier — 12 approved links in 3 weeks. Reels CTR is silly right now.",
    ago: 2,
  },
  {
    id: "s2",
    user: "peptide_pro",
    text: "Anyone running TB-500 angle on TikTok? The naturopath POV is converting at 4.8%.",
    ago: 8,
  },
  {
    id: "s3",
    user: "bio_lana",
    text: "First commission landed yesterday, $48 net. Felt unreal seeing it in the dashboard.",
    ago: 14,
  },
  {
    id: "s4",
    user: "gh_kings",
    text: "Best code placement? Bio link vs pinned comment — testing both, will share numbers.",
    ago: 26,
  },
  {
    id: "s5",
    user: "neural_nick",
    text: "AFFEXCH support replied to my payout dispute in 2 hrs. Cleared same day. Cracked.",
    ago: 42,
  },
];

function formatAgo(min) {
  if (min < 1) return "just now";
  if (min < 60) return `${Math.round(min)}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
}

function generateHandle() {
  const adj = ["neon", "matrix", "cryo", "alpha", "shadow", "north", "quantum", "binary"];
  const noun = ["pilot", "drift", "hawk", "byte", "node", "ridge", "scout", "fox"];
  return `${adj[Math.floor(Math.random() * adj.length)]}_${noun[Math.floor(Math.random() * noun.length)]}`;
}

function getOrCreateHandle() {
  try {
    const existing = localStorage.getItem(HANDLE_KEY);
    if (existing && /^[a-z0-9_]{2,32}$/i.test(existing)) return existing;
  } catch { /* localStorage may be unavailable */ }
  const fresh = generateHandle();
  try { localStorage.setItem(HANDLE_KEY, fresh); } catch { /* ignore */ }
  return fresh;
}

export default function AffiliateCommunityChat({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [me] = useState(getOrCreateHandle);
  const [online, setOnline] = useState(312);
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const feedRef = useRef(null);

  // Initial load + poll every 8s for new messages.
  useEffect(() => {
    let alive = true;
    const fetchMessages = async () => {
      try {
        const r = await fetch("/api/community-chat?limit=50");
        if (!r.ok) return;
        const rows = await r.json();
        if (!alive) return;
        setMessages(
          rows.map((m) => ({
            id: m.id,
            user: m.handle,
            text: m.text,
            ts: new Date(m.createdAt).getTime(),
            self: m.handle === me,
          }))
        );
      } catch { /* network blip — keep showing what we have */ }
    };
    fetchMessages();
    const iv = setInterval(fetchMessages, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [me]);

  // Presence jitter (cosmetic — not from server)
  useEffect(() => {
    const iv = setInterval(() => {
      setOnline((o) => Math.max(280, Math.min(340, o + (Math.random() > 0.5 ? 1 : -1))));
    }, 4500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");

    // Optimistic insert so the input feels instant
    const tempId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, user: me, text, ts: Date.now(), self: true, pending: true },
    ]);
    setDraft("");

    try {
      const r = await fetch("/api/community-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: me, text }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to send");
      // Replace optimistic message with persisted one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { id: data.id, user: data.handle, text: data.text, ts: new Date(data.createdAt).getTime(), self: true }
            : m
        )
      );
    } catch (err) {
      // Roll back optimistic insert + show error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError(err?.message || "Couldn't send message");
      setDraft(text); // restore the draft so the user can retry
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
          <div className="acc__chrome-channel">AFFILIATE COMMUNITY</div>
          <div className="acc__chrome-meta">
            <span className="acc__pulse" /> {online} online · #wins-and-strategy
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="acc__chrome-close"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        )}
      </header>

      <div className="acc__feed" ref={feedRef}>
        {messages.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(0,255,231,0.45)", fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
            // loading messages...
          </div>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={"acc-msg" + (m.self ? " acc-msg--self" : "") + (m.pending ? " acc-msg--pending" : "")}>
              <div className="acc-msg__head">
                <span className="acc-msg__avatar">{m.user.slice(0, 2).toUpperCase()}</span>
                <span className="acc-msg__user">@{m.user}</span>
                <span className="acc-msg__sep">·</span>
                <time className="acc-msg__time" dateTime={new Date(m.ts).toISOString()}>
                  {m.pending ? "sending..." : formatAgo((Date.now() - m.ts) / 60_000)}
                </time>
              </div>
              <p className="acc-msg__text">{m.text}</p>
            </article>
          ))
        )}
      </div>

      <form className="acc__compose" onSubmit={handleSend} autoComplete="off">
        <span className="acc__compose-handle">@{me}</span>
        <input
          type="text"
          inputMode="text"
          className="acc__compose-input"
          placeholder="drop a message to the community..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={280}
          spellCheck={false}
          disabled={sending}
        />
        <button
          type="submit"
          className="acc__compose-btn"
          aria-label="Send message"
          disabled={!draft.trim() || sending}
        >
          <Send size={14} strokeWidth={1.9} aria-hidden />
          <span>{sending ? "..." : "SEND"}</span>
        </button>
      </form>

      {sendError && (
        <div style={{ padding: "8px 14px", fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--hot)", borderTop: "1px solid rgba(255,0,102,0.3)" }}>
          // {sendError}
        </div>
      )}
    </div>
  );
}
