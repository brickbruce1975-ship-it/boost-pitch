/** CAGE INFRA / SOCIAL_INTEL — read_only public AppView. Outbound publish stays gated. */

export type SkyPost = {
  platform: "bluesky";
  id: string;
  uri: string;
  author: string;
  text: string;
  created_at: string;
};

const APPVIEW = "https://public.api.bsky.app";
const TRADE_RE = /\b(buy|sell|pump|apy|airdrop|wallet|ca:|contract address)\b/i;

export function isTradeSignal(text: string) {
  return TRADE_RE.test(text);
}

export async function searchOrbitPosts(query = "Brick Bruce The Orbit", limit = 6): Promise<SkyPost[]> {
  const url = new URL(`${APPVIEW}/xrpc/app.bsky.feed.searchPosts`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(12, Math.max(1, limit))));
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "BoostPitch/1.0 (cage-bluesky-integration; read_only)",
    },
  });
  if (!res.ok) throw new Error(`bsky search ${res.status}`);
  const data = (await res.json()) as {
    posts?: {
      uri: string;
      author?: { handle?: string };
      record?: { text?: string; createdAt?: string };
    }[];
  };
  const posts: SkyPost[] = [];
  for (const p of data.posts ?? []) {
    const text = p.record?.text ?? "";
    if (!text || isTradeSignal(text)) continue;
    posts.push({
      platform: "bluesky",
      id: p.uri,
      uri: p.uri,
      author: p.author?.handle ?? "unknown",
      text,
      created_at: p.record?.createdAt ?? "",
    });
    if (posts.length >= limit) break;
  }
  return posts;
}

export const ORBIT_DRAFT = `The Orbit is on Boost Pitch — Brick Bruce full album, cover coupe, no red car. Suit Up first. Stream The Orbit.`;
