import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import AffiliateCommunityChat from "../landing-affexch/community/AffiliateCommunityChat";
import "../landing-affexch/community/AffiliateCommunityChat.css";
import "./CreatorCommunityChatFab.css";

// Creator-side community chat launcher.
// Same chat panel as the landing page, but the FAB lives in the bottom-LEFT
// corner so it doesn't collide with the right-side topbar / scrollbar inside
// the authenticated app shell.

export function CreatorCommunityChatFab() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(3); // teaser badge until first open

  // Two-phase mount/unmount so the entrance/exit animation can play smoothly.
  useEffect(() => {
    if (open) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clear teaser once opened
  useEffect(() => {
    if (open) setUnread(0);
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
        aria-label="Open community chat"
        aria-expanded={open}
        aria-controls="creator-community-chat-popup"
      >
        <span className="cccfab__ring" />
        <span className="cccfab__pulse" />
        <MessageCircle size={20} strokeWidth={1.9} aria-hidden />
        {unread > 0 && (
          <span className="cccfab__badge" aria-label={`${unread} new messages`}>{unread}</span>
        )}
        <span className="cccfab__label">CHAT</span>
      </button>

      {mounted && (
        <div
          id="creator-community-chat-popup"
          className={"cccp" + (open ? " is-open" : " is-closing")}
          role="dialog"
          aria-modal="true"
          aria-label="Community chat"
        >
          <button
            type="button"
            className="cccp__backdrop"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />
          <div className="cccp__panel">
            <AffiliateCommunityChat onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
