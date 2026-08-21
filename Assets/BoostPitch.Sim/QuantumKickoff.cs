using System;

namespace BoostPitch.Sim
{
    /// <summary>
    /// Educational H + CNOT kickoff sampler. Same mapping as src/game/quantumKickoff.ts.
    /// simulation_only — not a live QPU.
    /// </summary>
    public static class QuantumKickoff
    {
        public struct Nudge
        {
            public float vx, vz;
            public string bits;
        }

        public static Nudge Sample(int seed)
        {
            var rnd = new Random(seed);
            int bit0 = rnd.NextDouble() < 0.5 ? 0 : 1;
            int bit1 = bit0; // CNOT copies
            float signZ = bit0 == 0 ? -1f : 1f;
            float signX = bit1 == 0 ? -1f : 1f;
            return new Nudge
            {
                bits = bit0.ToString() + bit1,
                vx = signX * 2.4f,
                vz = signZ * 6.2f
            };
        }
    }
}
