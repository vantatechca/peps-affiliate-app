import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { LifeBuoy, Send, Inbox } from "lucide-react";

// Admin support inbox — every affiliate's private support thread. Admins read
// and reply here; replies notify the affiliate.

type ThreadRow = {
  id: string;
  creatorId: string;
  status: "open" | "closed";
  lastMessageAt: string | null;
  adminUnreadCount: number;
  creatorUsername: string | null;
  creatorEmail: string | null;
  creatorFirstName: string | null;
  creatorLastName: string | null;
};

type Message = {
  id: string;
  senderRole: "creator" | "admin";
  body: string;
  createdAt: string;
};

function creatorName(t: ThreadRow) {
  const full = [t.creatorFirstName, t.creatorLastName].filter(Boolean).join(" ").trim();
  return full || t.creatorUsername || t.creatorEmail || "Affiliate";
}

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: threads = [], isLoading } = useQuery<ThreadRow[]>({
    queryKey: ["/api/admin/support-threads"],
    refetchInterval: 15000,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-3 sm:px-4">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-primary" /> Support Inbox
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Affiliate support threads. Click a thread to read and reply.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* Thread list */}
        <Card className="h-[70vh] overflow-hidden">
          <CardContent className="p-0 h-full overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4">Loading…</p>
            ) : threads.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-6">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No support threads yet.
              </div>
            ) : (
              <ul className="divide-y">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-muted transition-colors ${
                        activeId === t.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{creatorName(t)}</span>
                        {t.adminUnreadCount > 0 && (
                          <Badge className="text-[10px] bg-primary text-primary-foreground shrink-0">
                            {t.adminUnreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {t.creatorEmail}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleString() : "—"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Thread view */}
        <Card className="h-[70vh] overflow-hidden">
          <CardContent className="p-0 h-full">
            {activeId ? (
              <ThreadView threadId={activeId} onSent={() => qc.invalidateQueries({ queryKey: ["/api/admin/support-threads"] })} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a thread to view the conversation.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ThreadView({ threadId, onSent }: { threadId: string; onSent: () => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery<{ thread: ThreadRow; messages: Message[] }>({
    queryKey: ["/api/admin/support-threads", threadId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/support-threads/${threadId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load thread");
      return r.json();
    },
    refetchInterval: 10000,
  });

  const messages = data?.messages ?? [];

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  const reply = useMutation({
    mutationFn: async (body: string) => {
      const r = await fetch(`/api/admin/support-threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Failed to send");
      return d;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["/api/admin/support-threads", threadId] });
      onSent();
    },
  });

  const send = () => {
    const body = draft.trim();
    if (body) reply.mutate(body);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  m.senderRole === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="text-[10px] opacity-70 mb-0.5">
                  {m.senderRole === "admin" ? "You (support)" : "Affiliate"} ·{" "}
                  {new Date(m.createdAt).toLocaleString()}
                </div>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t p-3 flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your reply…"
          rows={2}
          className="resize-none"
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button onClick={send} disabled={!draft.trim() || reply.isPending} className="shrink-0">
          <Send className="h-4 w-4 mr-1" /> {reply.isPending ? "…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
