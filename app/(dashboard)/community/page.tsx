"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Heart, MessageCircle, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Author = { id: string; username: string; avatarurl: string };

type Post = {
  id: string;
  user_id: string;
  text: string | null;
  image_url: string | null;
  likes: number;
  comments: number;
  created_at: string | null;
  author: Author | null;
};

type LikeUser = {
  user_id: string;
  created_at: string | null;
  user: Author | null;
};

type Comment = {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string | null;
  author: Author | null;
  replies: (Comment & { author: Author | null })[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) + "…" : "—");

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, highlight }: { post: Post; highlight?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [likesOpen, setLikesOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    if (highlight && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  async function loadLikes() {
    if (likes.length > 0) { setLikesOpen(v => !v); return; }
    setLikesLoading(true);
    const res = await fetch(`/api/community/${post.id}/likes`);
    if (res.ok) { const d = await res.json(); setLikes(d.data ?? []); }
    setLikesLoading(false);
    setLikesOpen(true);
  }

  async function loadComments() {
    if (comments.length > 0) { setCommentsOpen(v => !v); return; }
    setCommentsLoading(true);
    const res = await fetch(`/api/community/${post.id}/comments`);
    if (res.ok) { const d = await res.json(); setComments(d.data ?? []); }
    setCommentsLoading(false);
    setCommentsOpen(true);
  }

  return (
    <div ref={ref} className={`rounded-lg border p-4 space-y-3 transition-colors ${highlight ? "border-blue-500/60 bg-blue-500/5" : "border-border bg-card"}`}>
      {/* Author */}
      <div className="flex items-center gap-2.5">
        <Link href={`/users/${post.user_id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="relative size-8 rounded-full overflow-hidden bg-muted shrink-0">
            {post.author?.avatarurl && (
              <Image src={post.author.avatarurl} alt="" fill className="object-cover" unoptimized sizes="32px" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium leading-none">{post.author?.username ?? shortId(post.user_id)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(post.created_at)}</p>
          </div>
        </Link>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">{post.id.slice(0, 8)}…</span>
      </div>

      {/* Content */}
      <div className="flex items-start gap-3">
        {post.text && <p className="text-sm leading-relaxed flex-1">{post.text}</p>}
        {post.image_url && (
          <a href={post.image_url} target="_blank" rel="noreferrer">
            <div className="relative size-16 rounded-md overflow-hidden shrink-0 border border-border">
              <Image src={post.image_url} alt="post" fill className="object-cover" unoptimized sizes="64px" />
            </div>
          </a>
        )}
        {!post.text && !post.image_url && (
          <p className="text-sm italic text-muted-foreground">Empty post</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={loadLikes} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {likesLoading ? <Loader2 className="size-3 animate-spin" /> : <Heart className={`size-3 ${likesOpen ? "text-red-400" : ""}`} />}
          <span className={likesOpen ? "text-red-400" : ""}>{post.likes} likes</span>
          {likesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {commentsLoading ? <Loader2 className="size-3 animate-spin" /> : <MessageCircle className={`size-3 ${commentsOpen ? "text-blue-400" : ""}`} />}
          <span className={commentsOpen ? "text-blue-400" : ""}>{post.comments} comments</span>
          {commentsOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      </div>

      {/* Likes list */}
      {likesOpen && (
        <div className="rounded-md bg-muted/30 p-3">
          {likes.length === 0 ? <p className="text-xs text-muted-foreground italic">No likes yet.</p> : (
            <>
              <p className="text-xs font-medium text-muted-foreground mb-2">Liked by</p>
              <div className="flex flex-wrap gap-2">
                {likes.map((l) => (
                  <Link key={l.user_id} href={`/users/${l.user_id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <div className="relative size-5 rounded-full overflow-hidden bg-muted shrink-0">
                      {l.user?.avatarurl && <Image src={l.user.avatarurl} alt="" fill className="object-cover" unoptimized sizes="20px" />}
                    </div>
                    <span className="text-xs">{l.user?.username ?? shortId(l.user_id)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Comments list */}
      {commentsOpen && (
        <div className="space-y-2">
          {comments.length === 0 && <p className="text-xs text-muted-foreground italic">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex gap-2 rounded-md bg-muted/20 p-2.5">
                <Link href={`/users/${c.user_id}`} className="shrink-0 mt-0.5">
                  <div className="relative size-6 rounded-full overflow-hidden bg-muted">
                    {c.author?.avatarurl && <Image src={c.author.avatarurl} alt="" fill className="object-cover" unoptimized sizes="24px" />}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Link href={`/users/${c.user_id}`} className="text-xs font-medium hover:underline">{c.author?.username ?? shortId(c.user_id)}</Link>
                    <span className="text-xs text-muted-foreground">{fmt(c.created_at)}</span>
                    <span className="ml-auto text-xs text-muted-foreground flex items-center gap-0.5"><Heart className="size-2.5" />{c.likes_count}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
              {c.replies && c.replies.length > 0 && (
                <div className="ml-8 space-y-1.5">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex gap-2 rounded-md bg-muted/10 p-2 border-l-2 border-border/50 pl-3">
                      <Link href={`/users/${r.user_id}`} className="shrink-0 mt-0.5">
                        <div className="relative size-5 rounded-full overflow-hidden bg-muted">
                          {r.author?.avatarurl && <Image src={r.author.avatarurl} alt="" fill className="object-cover" unoptimized sizes="20px" />}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Link href={`/users/${r.user_id}`} className="text-xs font-medium hover:underline">{r.author?.username ?? shortId(r.user_id)}</Link>
                          <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span>
                          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-0.5"><Heart className="size-2.5" />{r.likes_count}</span>
                        </div>
                        <p className="text-sm">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function CommunityInner() {
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("post");

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    const res = await fetch(`/api/community?${params}`);
    if (res.ok) {
      const d = await res.json();
      setPosts(d.data ?? []);
      setTotal(d.count ?? 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / LIMIT);
  const filtered = search.trim()
    ? posts.filter(p =>
        p.text?.toLowerCase().includes(search.toLowerCase()) ||
        p.author?.username?.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total.toLocaleString()} posts · page {page}/{pages || 1}
            {targetPostId && <span className="ml-2 text-blue-400 text-xs">Showing linked post</span>}
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by text or username…"
              className="pl-8 h-8 text-xs w-56"
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" type="button" onClick={() => { setSearch(""); setSearchInput(""); }} className="h-8 text-xs px-2">
              Clear
            </Button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16">No posts found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <PostCard key={post.id} post={post} highlight={post.id === targetPostId} />
          ))}
        </div>
      )}

      {pages > 1 && !search && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{total.toLocaleString()} total · page {page}/{pages}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="size-3" />
            </Button>
            <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <CommunityInner />
    </Suspense>
  );
}
