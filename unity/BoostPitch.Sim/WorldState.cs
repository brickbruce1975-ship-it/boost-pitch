using System;

namespace BoostPitch.Sim
{
    [Serializable]
    public struct Vec3
    {
        public float x, y, z;
        public Vec3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
    }

    [Serializable]
    public struct Actions
    {
        public float throttle; // -1..1  W/S
        public float steer;    // +1 = A / left (yaw+), -1 = D / right
        public float pitch;
        public bool boost;
        public bool jump;
    }

    [Serializable]
    public class CarState
    {
        public int id;
        public string peerId;
        public int team; // 0 cyan, 1 amber
        public bool isPlayer;
        public bool remote;
        public string name;
        public string livery;
        public Vec3 pos;
        public Vec3 vel;
        public float yaw;
        public float pitch;
        public float boost;
        public bool onGround;
        public bool boosting;
    }

    [Serializable]
    public class BallState
    {
        public Vec3 pos;
        public Vec3 vel;
    }

    [Serializable]
    public class WorldSnapshot
    {
        public CarState[] cars;
        public BallState ball;
        public int scoreCyan;
        public int scoreAmber;
        public float clock;
        public bool overtime;
        public string phase;
        public string lastNudgeBits;
    }
}
