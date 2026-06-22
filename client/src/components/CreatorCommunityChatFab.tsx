import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import CreatorSupportChat from "./CreatorSupportChat";
import "../landing-affexch/community/AffiliateCommunityChat.css";
import "./CreatorCommunityChatFab.css";

// Creator-side support chat launcher.
// Opens the affiliate's private support thread with the admin team. The FAB
// lives in the bottom-LEFT corner so it doesn't collide with the right-side
// topbar / scrollbar inside the authenticated app shell.

export function CreatorCommunityChatFab() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0); // unread admin replies

  // Two-phase mount/unmount so the entrance/exit animation can play smoothly.
  useEffect(() => {
    if (open) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Poll the thread for unread admin replies (skip while open — opening clears them).
  useEffect(() => {
    if (open) {
      setUnread(0);
      return;
    }
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/affiliate/support/unread", { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        if (alive) setUnread(data?.unread ?? 0);
      } catch {
        /* ignore */
      }
    };
    poll();
    const iv = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll on mobile only
  useEffect(() => {
    if (!open) return;
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={"cccfab" + (open ? " cccfab--hidden" : "")}
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        aria-expanded={open}
        aria-controls="creator-support-chat-popup"
      >
        <span className="cccfab__ring" />
        <span className="cccfab__pulse" />
        <MessageCircle size={20} strokeWidth={1.9} aria-hidden />
        {unread > 0 && (
          <span className="cccfab__badge" aria-label={`${unread} new messages`}>{unread}</span>
        )}
        <span className="cccfab__label">SUPPORT</span>
      </button>

      {mounted && (
        <div
          id="creator-support-chat-popup"
          className={"cccp" + (open ? " is-open" : " is-closing")}
          role="dialog"
          aria-modal="true"
          aria-label="Support chat"
        >
          <button
            type="button"
            className="cccp__backdrop"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />
          <div className="cccp__panel">
            <CreatorSupportChat onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
