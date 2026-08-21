import { useEffect, useState } from "react";
import { ORBIT_DRAFT, type SkyPost } from "@/lib/bluesky/public";

export function OrbitSkyline() {
  const [posts, setPosts] = useState<SkyPost[]>([]);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"idle" | "live" | "quiet">("idle");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bsky/feed")
      .then((r) => r.json())
      .then((data: { posts?: SkyPost[] }) => {
        if (cancelled) return;
        const next = data.posts ?? [];
        setPosts(next);
        setStatus(next.length ? "live" : "quiet");
      })
      .catch(() => {
        if (!cancelled) setStatus("quiet");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(ORBIT_DRAFT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5 rounded-md border border-line/10 bg-raised/60 p-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[11px] tracking-[0.28em] text-cyan uppercase">Bluesky · read only</p>
        <button
          type="button"
          onClick={copyDraft}
          className="font-display text-[10px] tracking-widest text-muted uppercase hover:text-cyan"
        >
          {copied ? "Draft copied" : "Copy draft"}
        </button>
      </div>
      {status === "idle" ? <p className="mt-2 text-[11px] text-muted">Listening…</p> : null}
      {status === "quiet" ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted">No public Orbit chatter yet. Publish stays gated.</p>
      ) : null}
      {posts.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {posts.slice(0, 3).map((p) => (
            <li key={p.id} className="text-[11px] leading-snug text-fg/90">
              <span className="text-muted">@{p.author}</span> {p.text.slice(0, 140)}
              {p.text.length > 140 ? "…" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
