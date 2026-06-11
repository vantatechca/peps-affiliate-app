import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import AffiliateCommunityChat from "./AffiliateCommunityChat";
import "./CommunityChatPopup.css";

/* Floating chat launcher.
   - FAB pinned to the bottom-right of the viewport
   - Click → modal slides up anchored to the FAB (desktop) or full-screen (mobile)
   - Esc / backdrop / X all close
   - Two-phase mount so the entrance animation can play smoothly */
export default function CommunityChatPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(3); // teaser badge until first open

  // Two-phase mount/unmount
  useEffect(() => {
    if (open) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clear unread badge once the user opens the chat
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll on mobile only (where the popup goes full-screen)
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
      {/* Floating launcher button */}
      <button
        type="button"
        className={"ccp-fab" + (open ? " ccp-fab--hidden" : "")}
        onClick={() => setOpen(true)}
        aria-label="Open affiliate community chat"
        aria-expanded={open}
        aria-controls="affiliate-community-chat-popup"
      >
        <span className="ccp-fab__ring" />
        <span className="ccp-fab__pulse" />
        <MessageCircle size={22} strokeWidth={1.8} aria-hidden />
        {unread > 0 && <span className="ccp-fab__badge" aria-label={`${unread} new messages`}>{unread}</span>}
        <span className="ccp-fab__label">CHAT</span>
      </button>

      {/* Modal */}
      {mounted && (
        <div
          id="affiliate-community-chat-popup"
          className={"ccp" + (open ? " is-open" : " is-closing")}
          role="dialog"
          aria-modal="true"
          aria-label="Affiliate community chat"
        >
          <button
            type="button"
            className="ccp__backdrop"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />
          <div className="ccp__panel">
            <AffiliateCommunityChat onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
