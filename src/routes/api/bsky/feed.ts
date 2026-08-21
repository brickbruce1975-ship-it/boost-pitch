import { createFileRoute } from "@tanstack/react-router";
import { searchOrbitPosts } from "@/lib/bluesky/public";

export const Route = createFileRoute("/api/bsky/feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams.get("q") ?? "Brick Bruce The Orbit";
        try {
          const posts = await searchOrbitPosts(q, 5);
          return Response.json({
            source: "cage-bluesky-integration",
            mode: "read_only",
            outbound: "blocked",
            true_agi: false,
            posts,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "bsky unavailable";
          return Response.json({ source: "cage-bluesky-integration", mode: "read_only", posts: [], error: message }, { status: 200 });
        }
      },
    },
  },
});
