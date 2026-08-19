namespace BoostPitch.Sim
{
    /// <summary>
    /// Documented step order matching src/game/sim.ts stepWorld.
    /// Implement the arcade integrator here — do not start with WheelCollider
    /// unless you re-tune every constant in SimConstants.
    ///
    /// Basis: +Y up, yaw 0 faces world −Z, +yaw is CCW (A / left).
    /// </summary>
    public static class WorldStepper
    {
        /// <summary>
        /// Fixed-dt tick. Call 120 times per second with SimConstants.Dt.
        ///
        /// Order (must stay aligned with the browser):
        /// 1. Phase machine (menu / countdown / play / goal / over)
        /// 2. Step each non-remote car from Actions (or bot policy)
        /// 3. Step ball (gravity, drag, bounce)
        /// 4. Car–car then car–ball collisions
        /// 5. Boost pad pickup
        /// 6. Goal test → score + kickoff reset
        ///
        /// carsOnly: clients step their local car only; host sends ball/clock.
        /// Casual P2P only — add a dedicated server before any ranked mode.
        /// </summary>
        public static void Step(WorldSnapshot world, Actions local, float dt, bool carsOnly = false)
        {
            // Intentionally empty: port stepWorld from src/game/sim.ts.
            _ = world;
            _ = local;
            _ = dt;
            _ = carsOnly;
        }
    }
}
