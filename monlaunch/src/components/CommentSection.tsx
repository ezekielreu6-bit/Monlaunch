"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { shortAddress, timeAgo } from "@/lib/utils";
import { type Comment } from "@/lib/schema";
import { MessageSquare, Send, Loader2 } from "lucide-react";

interface Props {
  tokenAddress: string;
  initialComments: Comment[];
}

export default function CommentSection({ tokenAddress, initialComments }: Props) {
  const { address, isConnected } = useAccount();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim() || !address) return;
    if (text.length > 500) {
      toast.error("Comment too long (max 500 chars)");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenAddress, authorAddress: address, content: text.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post");
      const newComment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setText("");
      toast.success("Comment posted!");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-text-secondary" />
        <h3 className="text-sm font-semibold text-text-primary">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Input */}
      <div className="p-4 border-b border-border">
        {isConnected ? (
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something about this token..."
              rows={2}
              maxLength={500}
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none outline-none focus:border-primary/50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) handlePost();
              }}
            />
            <button
              onClick={handlePost}
              disabled={posting || !text.trim()}
              className="self-end px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Connect wallet to comment</p>
            <ConnectButton showBalance={false} />
          </div>
        )}
      </div>

      {/* Comments list */}
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No comments yet. Be the first!
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="px-4 py-3 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-light">
                    {c.authorAddress.slice(2, 4).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-mono text-primary-light">
                  {shortAddress(c.authorAddress)}
                </span>
                <span className="text-xs text-text-muted ml-auto">
                  {timeAgo(c.createdAt!)}
                </span>
              </div>
              <p className="text-sm text-text-secondary ml-8 leading-relaxed break-words">
                {c.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
