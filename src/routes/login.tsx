import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-fg">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-cyan/20 bg-surface p-8 shadow-[0_0_80px_rgba(46,230,214,0.08)]">
        <div>
          <p className="font-display text-sm tracking-[0.35em] text-cyan uppercase">Boost Pitch</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-wide">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Optional — play as a guest any time. Sign in to stamp your name on local bests.</p>
        </div>
        {authEnabled ? (
          <div className="space-y-3">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="w-full rounded-md border border-line/20 bg-raised px-4 py-3 font-display text-lg font-semibold tracking-wide text-fg transition hover:border-cyan/50 hover:text-cyan"
              >
                Continue with {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="block text-center font-display text-sm tracking-widest text-muted uppercase hover:text-cyan">
          Back to the pitch
        </Link>
      </div>
    </main>
  );
}
