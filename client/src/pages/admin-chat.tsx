import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ArrowLeft, MessageCircle, Send, Loader2, ShieldAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: number;
  userId: number;
  senderType: string;
  content: string;
  isReadByAdmin: boolean;
  isReadByCustomer: boolean;
  createdAt: string | null;
}

interface ChatThread {
  userId: number;
  username: string;
  lastMessage: { content: string; senderType: string; createdAt: string | null };
  unreadByAdmin: number;
}

export default function AdminChat() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threads = [], isLoading: threadsLoading } = useQuery<ChatThread[]>({
    queryKey: ["/api/chat/threads"],
    refetchInterval: 5000,
    enabled: !!user?.isAdmin,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/threads", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/chat/threads/${selectedUserId}`, {
        headers: { "x-user-id": String(user!.id) },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: selectedUserId ? 3000 : false,
    enabled: !!selectedUserId && !!user?.isAdmin,
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/threads/${selectedUserId}/reply`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
    },
  });

  useEffect(() => {
    if (selectedUserId) {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
    }
  }, [selectedUserId]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedUserId || replyMutation.isPending) return;
    setInput("");
    await replyMutation.mutateAsync(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedThread = threads.find((t) => t.userId === selectedUserId);

  if (!user?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 w-full text-center py-20">
        <ShieldAlert className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Admins only</h1>
        <Link href="/products"><Button data-testid="button-back-products">Back to products</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full">
      <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-6 group" data-testid="link-back-to-products">
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to products
      </Link>

      <div className="mb-6">
        <h1 className="text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-primary" /> Customer Chat
        </h1>
        <p className="text-muted-foreground mt-1">Respond to customer questions and order concerns.</p>
      </div>

      <div className="flex h-[min(580px,calc(100dvh-13rem))] min-h-[440px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:h-[580px] md:min-h-0 md:flex-row">
        {/* Thread List */}
        <div className="flex h-40 w-full shrink-0 flex-col border-b border-border md:h-auto md:w-64 md:border-b-0 md:border-r">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.userId}
                  onClick={() => setSelectedUserId(thread.userId)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${
                    selectedUserId === thread.userId ? "bg-primary/10 border-l-2 border-l-primary" : ""
                  }`}
                  data-testid={`thread-${thread.userId}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground truncate max-w-[100px]">{thread.username}</span>
                    </div>
                    {thread.unreadByAdmin > 0 && (
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 shrink-0">
                        {thread.unreadByAdmin}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {thread.lastMessage.senderType === "admin" ? "You: " : ""}{thread.lastMessage.content}
                  </p>
                  {thread.lastMessage.createdAt && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {new Date(thread.lastMessage.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!selectedUserId ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-2 text-center px-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground/20" />
              <p className="text-muted-foreground">Select a conversation to start replying</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedThread?.username ?? `User #${selectedUserId}`}</p>
                  <p className="text-xs text-muted-foreground">Customer</p>
                </div>
              </div>

              {/* Messages */}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background/40 px-5 py-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No messages yet in this thread.</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                          msg.senderType === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border text-foreground rounded-bl-sm"
                        }`}
                        data-testid={`admin-msg-${msg.id}`}
                      >
                        {msg.senderType === "customer" && (
                          <span className="block text-[10px] font-semibold text-primary mb-0.5">{selectedThread?.username}</span>
                        )}
                        {msg.content}
                        <span className={`block text-[10px] mt-0.5 ${msg.senderType === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-4 py-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your reply..."
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                  disabled={replyMutation.isPending}
                  data-testid="input-admin-reply"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || replyMutation.isPending}
                  className="shrink-0 w-10 h-10 rounded-xl"
                  data-testid="button-admin-send"
                >
                  {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
