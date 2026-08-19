namespace BoostPitch.Sim
{
    /// <summary>Mirrors src/game/types.ts — do not drift.</summary>
    public static class SimConstants
    {
        public const float HalfW = 40f;
        public const float HalfL = 56f;
        public const float WallH = 16f;
        public const float GoalHalfW = 9f;
        public const float GoalH = 7.2f;
        public const float GoalDepth = 5.5f;
        public const float BallRadius = 1.55f;
        public const float CarRadius = 1.12f;
        public const float CarHeight = 0.42f;
        public const float Dt = 1f / 120f;
        public const int MatchSeconds = 180;
        public const int MaxCars = 8;
        public const string DefaultDriver = "Brick Bruce";
        public const string DefaultLivery = "brick";
    }
}
