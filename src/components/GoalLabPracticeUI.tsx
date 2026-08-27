import type { Snapshot } from "../game/types";

type GoalLabPracticeMenuProps = {
  onStart: () => void;
  disabled?: boolean;
};

type GoalLabAttemptHudProps = {
  snapshot: Snapshot;
};

type PracticeSessionSummaryProps = {
  snapshot: Snapshot;
  onRetry: () => void;
  onExit: () => void;
};

function formatAttemptTime(seconds: number | null) {
  if (seconds === null) return "—";
  const clamped = Math.max(0, seconds);
  return `0:${Math.ceil(clamped).toString().padStart(2, "0")}`;
}

function resultCopy(result: Snapshot["practiceResult"]) {
  if (result === "success") return { title: "Clean Finish", detail: "You found the target net." };
  if (result === "own_goal") return { title: "Own Goal", detail: "Reset and approach through the ball." };
  if (result === "miss") return { title: "Time", detail: "Line up the next attempt." };
  return null;
}

/**
 * Intended for the existing main-menu practice row. It starts a simulation-owned
 * Goal Lab session; the component does not move the ball or calculate results.
 */
export function GoalLabPracticeMenu({ onStart, disabled = false }: GoalLabPracticeMenuProps) {
  return (
    <section className="border border-cyan/25 bg-ink/70 p-4 text-left backdrop-blur-sm" aria-labelledby="goal-lab-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-cyan uppercase">Practice</p>
          <h2 id="goal-lab-title" className="mt-1 font-display text-2xl font-bold tracking-wide text-fg">
            Goal Lab
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Drive through the rolling ball and finish in the amber net. Each clear advances a deterministic lane.
          </p>
        </div>
        <span className="shrink-0 border border-amber/35 px-2 py-1 font-display text-[10px] tracking-[0.2em] text-amber uppercase">
          12 sec
        </span>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="mt-4 w-full border border-cyan/45 bg-cyan/10 px-4 py-3 font-display text-sm font-bold tracking-[0.24em] text-cyan uppercase disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start Goal Lab
      </button>
    </section>
  );
}

/** A non-interactive overlay for an active Goal Lab attempt. */
export function GoalLabAttemptHud({ snapshot }: GoalLabAttemptHudProps) {
  if (snapshot.phase !== "play" || snapshot.practice !== "goals" || snapshot.practiceResult !== "active") return null;
  const attempt = (snapshot.practiceAttempt ?? 0) + 1;
  return (
    <aside className="pointer-events-none absolute top-24 left-1/2 z-20 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 border border-cyan/30 bg-ink/75 px-4 py-3 text-center backdrop-blur-sm" aria-live="polite">
      <div className="flex items-center justify-between gap-3 font-display text-[11px] tracking-[0.24em] uppercase">
        <span className="text-cyan">Goal Lab · Attempt {attempt}</span>
        <span className="tabular-nums text-amber">{formatAttemptTime(snapshot.practiceRemaining)}</span>
      </div>
      <p className="mt-1 text-xs text-muted">Drive through the ball and finish in the amber net.</p>
      <div className="mt-3 h-px bg-linear-to-r from-transparent via-cyan/60 to-transparent" />
    </aside>
  );
}

/**
 * Result overlay for the simulation-owned 1.25-second result hold. `onRetry`
 * may restart Goal Lab and `onExit` may return to the existing menu flow.
 */
export function PracticeSessionSummary({ snapshot, onRetry, onExit }: PracticeSessionSummaryProps) {
  const copy = resultCopy(snapshot.practiceResult);
  if (snapshot.practice !== "goals" || !copy) return null;
  return (
    <section className="absolute inset-0 z-30 grid place-items-center bg-ink/45 px-4" role="status" aria-live="assertive">
      <div className="w-full max-w-sm border border-line/30 bg-ink/92 p-6 text-center backdrop-blur-sm">
        <p className="font-display text-[11px] tracking-[0.32em] text-cyan uppercase">Goal Lab</p>
        <h2 className={"mt-2 font-display text-4xl font-bold tracking-wide " + (snapshot.practiceResult === "success" ? "text-cyan" : "text-amber")}>
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.detail}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="border border-cyan/45 bg-cyan/10 px-3 py-2 font-display text-xs tracking-[0.18em] text-cyan uppercase"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onExit}
            className="border border-line/35 px-3 py-2 font-display text-xs tracking-[0.18em] text-muted uppercase"
          >
            Exit
          </button>
        </div>
      </div>
    </section>
  );
}
