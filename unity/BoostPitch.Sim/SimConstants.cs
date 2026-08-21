namespace BoostPitch.Sim
{
    /// <summary>Mirrors src/game/types.ts + sim.ts — do not drift.</summary>
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

        public const float Gravity = 34f;
        public const float BallG = 30f;
        public const float Accel = 40f;
        public const float Brake = 52f;
        public const float Reverse = 18f;
        public const float MaxSpd = 31f;
        public const float BoostAccel = 58f;
        public const float BoostMax = 43f;
        public const float BoostDrain = 34f;
        public const float Turn = 2.75f;
        public const float AirYaw = 2.15f;
        public const float AirPitch = 2.35f;
        public const float JumpV = 12.2f;
        public const float DblJumpV = 11.4f;
        public const float AirDrag = 0.38f;
        public const float RollDrag = 0.85f;
        public const float CoastDrag = 1.45f;
        public const float Mass = 1.2f;
        public const float Mu = 1.55f;
        public const float PacejkaB = 9.4f;
        public const float PacejkaC = 1.3f;
        public const float PacejkaE = 0.32f;
        public const float KappaScale = 0.12f;
        public const float RelaxLen = 0.42f;
        public const float Downforce = 0.016f;
        public const float SlipRef = 2.4f;
        public const float Track = 1.48f;
        public const float Axle = 0.88f;
        public const float WheelR = 0.33f;
        public const float WheelI = 0.024f;
        public const float Izz = 14f;
        public const float LsdPreload = 0.28f;
        public const float LsdGain = 0.55f;
        public const float LsdVisc = 0.2f;
        public const float LsdK = 1.6f;
        public const float WheelMax = 220f;
        public const float BallBounce = 0.64f;
        public const float BallDrag = 0.18f;
        public const float BallRoll = 1.4f;

        /// <summary>yaw 0 faces world −Z. +steer (A) increases yaw (CCW / left from chase cam).</summary>
        public static void Forward(float yaw, out float x, out float z)
        {
            x = -UnityEngine.Mathf.Sin(yaw);
            z = -UnityEngine.Mathf.Cos(yaw);
        }
    }
}
