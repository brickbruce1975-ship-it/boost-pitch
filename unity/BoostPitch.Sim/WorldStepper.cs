using System;
using UnityEngine;

namespace BoostPitch.Sim
{
    /// <summary>
    /// Arcade integrator matching src/game/sim.ts stepWorld.
    /// Source of truth is the browser. This file is the Unity drop-in — not a second physics story.
    /// architecture_only until a live Editor Play Mode pass (no Unity process in this sandbox).
    /// A / left = +yaw. Two rear Pacejka patches + clutch LSD. Boost is a thruster.
    /// </summary>
    public static class WorldStepper
    {
        public static WorldSnapshot CreateSolo(string name = null, string livery = null)
        {
            name = string.IsNullOrEmpty(name) ? SimConstants.DefaultDriver : name;
            livery = string.IsNullOrEmpty(livery) ? SimConstants.DefaultLivery : livery;
            var w = new WorldSnapshot
            {
                cars = new[]
                {
                    KickoffCar(0, 0, true, name, livery, "local-0"),
                    KickoffCar(1, 1, false, "Amber Bot", "amber", "bot-1"),
                },
                ball = new BallState { pos = new Vec3(0, SimConstants.BallRadius + 0.05f, 0), vel = new Vec3() },
                pads = MakePads(),
                scoreCyan = 0,
                scoreAmber = 0,
                clock = SimConstants.MatchSeconds,
                overtime = false,
                phase = "menu",
                countdown = 3,
                phaseT = 0,
                lastGoal = -1,
                lastNudgeBits = "00",
            };
            return w;
        }

        public static void StartMatch(WorldSnapshot w)
        {
            w.scoreCyan = 0;
            w.scoreAmber = 0;
            w.clock = SimConstants.MatchSeconds;
            w.overtime = false;
            w.lastGoal = -1;
            ResetKickoff(w);
            w.phase = "countdown";
            w.phaseT = 0;
        }

        public static void ResetKickoff(WorldSnapshot w)
        {
            if (w.cars == null || w.cars.Length < 2)
                w.cars = CreateSolo().cars;
            else
            {
                for (int i = 0; i < w.cars.Length; i++)
                {
                    var c = w.cars[i];
                    w.cars[i] = KickoffCar(c.id, c.team, c.isPlayer, c.name, c.livery, c.peerId);
                    w.cars[i].remote = c.remote;
                }
            }
            int seed = Environment.TickCount ^ (w.scoreCyan * 17 + w.scoreAmber * 31);
            var nudge = QuantumKickoff.Sample(seed);
            w.lastNudgeBits = nudge.bits;
            w.ball = new BallState
            {
                pos = new Vec3(0, SimConstants.BallRadius + 0.05f, 0),
                vel = new Vec3(nudge.vx, 0, nudge.vz),
            };
            if (w.pads == null || w.pads.Length == 0) w.pads = MakePads();
        }

        /// <summary>
        /// Fixed-dt tick. Call 120 times per second with SimConstants.Dt.
        /// carsOnly: clients step their local car only; host sends ball/clock.
        /// Casual P2P only — add a dedicated server before any ranked mode.
        /// </summary>
        public static void Step(WorldSnapshot w, Actions local, float dt, bool carsOnly = false, float lsdCap = 1f)
        {
            if (w == null || w.phase == "menu" || w.phase == "over") return;
            if (carsOnly)
            {
                foreach (var car in w.cars)
                {
                    if (car.remote) continue;
                    var a = car.isPlayer ? local : BotActions(w, car);
                    StepCar(car, a, dt, lsdCap);
                }
                return;
            }

            w.phaseT += dt;
            if (w.phase == "countdown")
            {
                w.countdown = Mathf.Max(0f, 3f - w.phaseT);
                if (w.phaseT >= 3f)
                {
                    w.phase = "play";
                    w.phaseT = 0;
                }
                return;
            }

            if (w.phase == "goal")
            {
                if (w.phaseT > 2.2f)
                {
                    ResetKickoff(w);
                    w.phase = "countdown";
                    w.phaseT = 0;
                }
                StepBall(w.ball, dt);
                return;
            }

            if (w.phase == "play" && !w.overtime)
            {
                w.clock = Mathf.Max(0f, w.clock - dt);
                if (w.clock <= 0f)
                {
                    if (w.scoreCyan != w.scoreAmber)
                    {
                        w.phase = "over";
                        return;
                    }
                    w.overtime = true;
                    w.clock = 0;
                    ResetKickoff(w);
                    w.phase = "countdown";
                    w.phaseT = 0;
                    return;
                }
            }

            foreach (var car in w.cars)
            {
                if (car.remote) continue;
                var a = car.isPlayer ? local : BotActions(w, car);
                StepCar(car, a, dt, lsdCap);
            }
            StepBall(w.ball, dt);
            for (int i = 0; i < w.cars.Length; i++)
                for (int j = i + 1; j < w.cars.Length; j++)
                    CollideCars(w.cars[i], w.cars[j]);
            foreach (var car in w.cars) CollideCarBall(car, w.ball);
            CollectPads(w, dt);

            int scored = CheckGoal(w);
            if (scored >= 0)
            {
                if (scored == 0) w.scoreCyan += 1;
                else w.scoreAmber += 1;
                w.lastGoal = scored;
                if (w.overtime) w.phase = "over";
                else
                {
                    w.phase = "goal";
                    w.phaseT = 0;
                }
            }
        }

        public static void StepCar(CarState car, Actions a, float dt, float lsdCap = 1f)
        {
            car.flipTimer = Mathf.Max(0f, car.flipTimer - dt);
            if (car.onGround) ApplyTires(car, a, dt, lsdCap);
            else StepAir(car, a, dt);

            car.jumpHeld = a.jump;
            car.pos.x += car.vel.x * dt;
            car.pos.y += car.vel.y * dt;
            car.pos.z += car.vel.z * dt;

            if (car.pos.y <= SimConstants.CarHeight)
            {
                car.pos.y = SimConstants.CarHeight;
                if (car.vel.y < 0) car.vel.y = 0;
                if (!car.onGround)
                {
                    car.onGround = true;
                    car.jumpsLeft = 2;
                    car.pitch *= 0.3f;
                    float hx = -Mathf.Sin(car.yaw);
                    float hz = -Mathf.Cos(car.yaw);
                    float along = car.vel.x * hx + car.vel.z * hz;
                    car.vel.x = hx * along + (car.vel.x - hx * along) * 0.35f;
                    car.vel.z = hz * along + (car.vel.z - hz * along) * 0.35f;
                    car.wL = along / SimConstants.WheelR;
                    car.wR = along / SimConstants.WheelR;
                }
            }

            if (ClampArena(ref car.pos, SimConstants.CarRadius * 0.85f, false, out float nx, out float ny, out float nz))
            {
                Bounce(ref car.vel, nx, ny, nz, 0.15f);
                car.vel.x *= 0.7f;
                car.vel.z *= 0.7f;
            }
        }

        /// <summary>Ground tires only — Rigidbody adapters call this then write planar velocity.</summary>
        public static void ApplyTires(CarState car, Actions a, float dt, float lsdCap = 1f)
        {
            car.pitch *= Mathf.Max(0f, 1f - 12f * dt);
            float along0 = car.vel.x * -Mathf.Sin(car.yaw) + car.vel.z * -Mathf.Cos(car.yaw);
            float driveAccel = 0f;
            if (a.throttle > 0.05f) driveAccel = SimConstants.Accel * a.throttle;
            else if (a.throttle < -0.05f) driveAccel = along0 > 0.6f ? -SimConstants.Brake : -SimConstants.Reverse;

            float boostAccel = 0f;
            if (a.boost && car.boost > 0f)
            {
                boostAccel = SimConstants.BoostAccel;
                car.boost = Mathf.Max(0f, car.boost - SimConstants.BoostDrain * dt);
                car.boosting = true;
            }
            else car.boosting = false;

            bool coasting = Mathf.Abs(a.throttle) < 0.05f && !car.boosting;
            float longDrag = coasting ? SimConstants.CoastDrag : SimConstants.RollDrag;
            float shift = boostAccel > 0f || driveAccel > 6f ? 0.05f : driveAccel < -10f || coasting ? -0.14f : 0f;
            float rotate = shift < -0.05f ? 1.22f : 1f;
            float reverse = along0 >= -0.4f ? 1f : -1f;
            float spd0 = Mathf.Sqrt(car.vel.x * car.vel.x + car.vel.z * car.vel.z);
            float speedFactor = Mathf.Min(1f, Mathf.Max(0.18f, spd0 / 10f));
            float steerFade = 1f / (1f + 1.15f * car.slip);
            float yawSteer = a.steer * SimConstants.Turn * speedFactor * reverse * steerFade * rotate;
            car.yaw += yawSteer * dt;

            float nx = -Mathf.Sin(car.yaw);
            float nz = -Mathf.Cos(car.yaw);
            float rx = Mathf.Cos(car.yaw);
            float rz = -Mathf.Sin(car.yaw);
            float along = car.vel.x * nx + car.vel.z * nz;
            float lat = car.vel.x * rx + car.vel.z * rz;
            float yawRate = car.yawRate;
            float halfT = SimConstants.Track * 0.5f;
            float vL = along - yawRate * halfT;
            float vR = along + yawRate * halfT;
            float latRear = lat + yawRate * SimConstants.Axle;

            float load = SimConstants.Mass * SimConstants.Gravity + SimConstants.Downforce * along * along;
            float latXfer = Mathf.Clamp(0.5f * (float)Math.Tanh(lat / 7f), -0.42f, 0.42f);
            float nL = 0.5f * load * (1f - latXfer);
            float nR = 0.5f * load * (1f + latXfer);
            nL = Mathf.Max(0.06f * load, nL);
            nR = Mathf.Max(0.06f * load, nR);
            float nFix = load / (nL + nR);
            nL *= nFix;
            nR *= nFix;

            Patch(latRear, vL, car.wL, nL, shift, out float fxL, out float fyL);
            Patch(latRear, vR, car.wR, nR, shift, out float fxR, out float fyR);

            float tAxle = SimConstants.Mass * driveAccel * SimConstants.WheelR;
            float tEach = tAxle * 0.5f;
            float dw = car.wL - car.wR;
            float tCap = (SimConstants.LsdPreload * SimConstants.Mu * load * 0.5f
                + SimConstants.LsdGain * Mathf.Abs(SimConstants.Mass * driveAccel)
                + SimConstants.LsdVisc * SimConstants.Mass * Mathf.Abs(dw))
                * SimConstants.WheelR * Mathf.Clamp01(lsdCap);
            float tLock = Mathf.Sign(dw == 0f ? 0f : dw) * Mathf.Min(Mathf.Abs(tCap), Mathf.Abs(dw) * SimConstants.LsdK);
            car.lock = Mathf.Clamp01((SimConstants.LsdPreload + SimConstants.LsdGain * Mathf.Abs(a.throttle)
                + SimConstants.LsdVisc * Mathf.Min(1f, Mathf.Abs(dw) * 0.08f)) * lsdCap);
            car.wL += ((tEach - tLock - fxL * SimConstants.WheelR) / SimConstants.WheelI) * dt;
            car.wR += ((tEach + tLock - fxR * SimConstants.WheelR) / SimConstants.WheelI) * dt;
            car.wL = Mathf.Clamp(car.wL, -SimConstants.WheelMax, SimConstants.WheelMax);
            car.wR = Mathf.Clamp(car.wR, -SimConstants.WheelMax, SimConstants.WheelMax);

            float mz = (fxR - fxL) * halfT;
            float yawDiff = mz / SimConstants.Izz;
            car.yaw += yawDiff * dt;
            car.yawRate = yawSteer + yawDiff;

            float fxDrive = fxL + fxR - SimConstants.Mass * along * longDrag;
            float fy = fyL + fyR;
            float rel = Mathf.Min(1f, (Mathf.Abs(along) + 3.5f) * dt / SimConstants.RelaxLen);
            car.fyFilt += (fy - car.fyFilt) * rel;
            along += (fxDrive / SimConstants.Mass + boostAccel) * dt;
            lat += (car.fyFilt / SimConstants.Mass) * dt;

            float alphaL = Mathf.Atan2(latRear, Mathf.Max(Mathf.Abs(vL), SimConstants.SlipRef));
            float alphaR = Mathf.Atan2(latRear, Mathf.Max(Mathf.Abs(vR), SimConstants.SlipRef));
            car.slip = Mathf.Max(Mathf.Abs(alphaL), Mathf.Abs(alphaR));
            float kappaL = (SimConstants.WheelR * car.wL - vL) / Mathf.Max(Mathf.Abs(vL), SimConstants.SlipRef);
            float kappaR = (SimConstants.WheelR * car.wR - vR) / Mathf.Max(Mathf.Abs(vR), SimConstants.SlipRef);
            car.kappa = 0.5f * (kappaL + kappaR);

            car.vel.x = nx * along + rx * lat;
            car.vel.z = nz * along + rz * lat;
            float cap = boostAccel > 0f ? SimConstants.BoostMax : SimConstants.MaxSpd;
            float hs = Mathf.Sqrt(car.vel.x * car.vel.x + car.vel.z * car.vel.z);
            if (hs > cap)
            {
                car.vel.x *= cap / hs;
                car.vel.z *= cap / hs;
            }

            if (a.jump && !car.jumpHeld)
            {
                car.vel.y = SimConstants.JumpV;
                car.onGround = false;
                car.jumpsLeft = 1;
            }
        }

        public static void StepAir(CarState car, Actions a, float dt)
        {
            car.slip = 0;
            car.kappa = 0;
            car.lock = 0;
            car.fyFilt *= 0.5f;
            car.wL *= Mathf.Max(0f, 1f - 0.9f * dt);
            car.wR *= Mathf.Max(0f, 1f - 0.9f * dt);
            car.yaw += a.steer * SimConstants.AirYaw * dt;
            car.yawRate = a.steer * SimConstants.AirYaw;
            car.pitch += a.pitch * SimConstants.AirPitch * dt;
            car.pitch = Mathf.Clamp(car.pitch, -1.15f, 1.15f);
            if (a.boost && car.boost > 0f)
            {
                float cy = Mathf.Cos(car.pitch);
                float fx = -Mathf.Sin(car.yaw) * cy;
                float fy = Mathf.Sin(car.pitch);
                float fz = -Mathf.Cos(car.yaw) * cy;
                car.vel.x += fx * SimConstants.BoostAccel * dt;
                car.vel.y += fy * SimConstants.BoostAccel * dt;
                car.vel.z += fz * SimConstants.BoostAccel * dt;
                car.boost = Mathf.Max(0f, car.boost - SimConstants.BoostDrain * dt);
                car.boosting = true;
            }
            else car.boosting = false;
            car.vel.y -= SimConstants.Gravity * dt;
            car.vel.x *= 1f - SimConstants.AirDrag * dt;
            car.vel.z *= 1f - SimConstants.AirDrag * dt;
            if (a.jump && !car.jumpHeld && car.jumpsLeft > 0)
            {
                car.jumpsLeft = 0;
                car.flipTimer = 0.28f;
                if (Mathf.Abs(a.steer) + Mathf.Abs(a.pitch) > 0.2f)
                {
                    float cy = Mathf.Cos(car.pitch);
                    float fx = -Mathf.Sin(car.yaw) * cy;
                    float fz = -Mathf.Cos(car.yaw) * cy;
                    car.vel.x += fx * 10f + a.steer * -8f;
                    car.vel.z += fz * 10f;
                    car.vel.y += 4.2f;
                }
                else car.vel.y = Mathf.Max(car.vel.y, 0f) + SimConstants.DblJumpV;
            }
        }

        static void Patch(float latRear, float vLong, float w, float n, float shift, out float fxTire, out float fyTire)
        {
            float d = Mathf.Max(0.8f, SimConstants.Mu * n * (1f + shift));
            float kappa = (SimConstants.WheelR * w - vLong) / Mathf.Max(Mathf.Abs(vLong), SimConstants.SlipRef);
            float alpha = Mathf.Atan2(latRear, Mathf.Max(Mathf.Abs(vLong), SimConstants.SlipRef));
            float fyScale = 1f / Mathf.Sqrt(1f + (kappa / SimConstants.KappaScale) * (kappa / SimConstants.KappaScale));
            fyTire = -Magic(alpha, d) * fyScale;
            fxTire = Magic(kappa, d);
            float ell = Mathf.Sqrt((fxTire / d) * (fxTire / d) + (fyTire / d) * (fyTire / d));
            if (ell > 1f)
            {
                fxTire /= ell;
                fyTire /= ell;
            }
        }

        static float Magic(float x, float d)
        {
            float bx = SimConstants.PacejkaB * x;
            return d * Mathf.Sin(SimConstants.PacejkaC * Mathf.Atan(bx - SimConstants.PacejkaE * (bx - Mathf.Atan(bx))));
        }

        static void StepBall(BallState ball, float dt)
        {
            ball.vel.y -= SimConstants.BallG * dt;
            ball.vel.y *= 1f - SimConstants.BallDrag * 0.35f * dt;
            ball.pos.x += ball.vel.x * dt;
            ball.pos.y += ball.vel.y * dt;
            ball.pos.z += ball.vel.z * dt;
            if (ball.pos.y < SimConstants.BallRadius)
            {
                ball.pos.y = SimConstants.BallRadius;
                if (ball.vel.y < 0) ball.vel.y = -ball.vel.y * SimConstants.BallBounce;
                ball.vel.x *= Mathf.Max(0f, 1f - SimConstants.BallRoll * dt);
                ball.vel.z *= Mathf.Max(0f, 1f - SimConstants.BallRoll * dt);
                if (Mathf.Abs(ball.vel.y) < 1.2f) ball.vel.y = 0;
            }
            else
            {
                ball.vel.x *= 1f - SimConstants.BallDrag * dt;
                ball.vel.z *= 1f - SimConstants.BallDrag * dt;
            }
            if (ClampArena(ref ball.pos, SimConstants.BallRadius, true, out float nx, out float ny, out float nz))
                Bounce(ref ball.vel, nx, ny, nz, SimConstants.BallBounce);
        }

        static void Bounce(ref Vec3 vel, float nx, float ny, float nz, float rest)
        {
            float vn = vel.x * nx + vel.y * ny + vel.z * nz;
            if (vn < 0)
            {
                vel.x -= (1 + rest) * vn * nx;
                vel.y -= (1 + rest) * vn * ny;
                vel.z -= (1 + rest) * vn * nz;
            }
        }

        static bool ClampArena(ref Vec3 p, float r, bool isBall, out float nx, out float ny, out float nz)
        {
            nx = ny = nz = 0;
            float halfW = SimConstants.HalfW, halfL = SimConstants.HalfL, wallH = SimConstants.WallH;
            float goalHalfW = SimConstants.GoalHalfW, goalH = SimConstants.GoalH, goalDepth = SimConstants.GoalDepth;
            bool inGoalX = Mathf.Abs(p.x) < goalHalfW - r * 0.2f;
            bool inGoalY = p.y < goalH - r * 0.15f;
            if (p.x > halfW - r) { p.x = halfW - r; nx = -1; return true; }
            if (p.x < -halfW + r) { p.x = -halfW + r; nx = 1; return true; }
            if (p.y > wallH - r) { p.y = wallH - r; ny = -1; return true; }
            float zLimit = halfL - r;
            if (p.z > zLimit)
            {
                if (isBall && inGoalX && inGoalY && p.z < halfL + goalDepth - r)
                {
                    if (p.z > halfL + goalDepth - r) { p.z = halfL + goalDepth - r; nz = -1; return true; }
                    return false;
                }
                p.z = zLimit; nz = -1; return true;
            }
            if (p.z < -zLimit)
            {
                if (isBall && inGoalX && inGoalY && p.z > -halfL - goalDepth + r)
                {
                    if (p.z < -halfL - goalDepth + r) { p.z = -halfL - goalDepth + r; nz = 1; return true; }
                    return false;
                }
                p.z = -zLimit; nz = 1; return true;
            }
            return false;
        }

        static void CollideCarBall(CarState car, BallState ball)
        {
            float dx = ball.pos.x - car.pos.x;
            float dy = ball.pos.y - (car.pos.y + 0.15f);
            float dz = ball.pos.z - car.pos.z;
            float dist = Mathf.Sqrt(dx * dx + dy * dy + dz * dz);
            float min = SimConstants.BallRadius + SimConstants.CarRadius;
            if (dist >= min || dist < 1e-5f) return;
            float nx = dx / dist, ny = dy / dist, nz = dz / dist;
            float push = min - dist;
            ball.pos.x += nx * push;
            ball.pos.y += ny * push;
            ball.pos.z += nz * push;
            float rvx = ball.vel.x - car.vel.x;
            float rvy = ball.vel.y - car.vel.y;
            float rvz = ball.vel.z - car.vel.z;
            float vn = rvx * nx + rvy * ny + rvz * nz;
            if (vn < 0)
            {
                float extra = (car.boosting ? 9f : 4f) + (car.flipTimer > 0 ? 6f : 0f);
                float j = -1.12f * vn + extra;
                ball.vel.x += j * nx;
                ball.vel.y += j * ny * 0.85f;
                ball.vel.z += j * nz;
                car.vel.x -= nx * 2.4f;
                car.vel.z -= nz * 2.4f;
            }
        }

        static void CollideCars(CarState a, CarState b)
        {
            float dx = b.pos.x - a.pos.x;
            float dz = b.pos.z - a.pos.z;
            float dist = Mathf.Sqrt(dx * dx + dz * dz);
            float min = SimConstants.CarRadius * 1.7f;
            if (dist >= min || dist < 1e-5f) return;
            float nx = dx / dist, nz = dz / dist;
            float push = (min - dist) * 0.5f;
            a.pos.x -= nx * push; a.pos.z -= nz * push;
            b.pos.x += nx * push; b.pos.z += nz * push;
            float rv = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
            if (rv < 0)
            {
                a.vel.x += nx * rv; a.vel.z += nz * rv;
                b.vel.x -= nx * rv; b.vel.z -= nz * rv;
            }
        }

        static void CollectPads(WorldSnapshot w, float dt)
        {
            if (w.pads == null) return;
            foreach (var pad in w.pads)
            {
                pad.ready = Mathf.Max(0f, pad.ready - dt);
                if (pad.ready > 0) continue;
                foreach (var car in w.cars)
                {
                    float dx = car.pos.x - pad.pos.x;
                    float dz = car.pos.z - pad.pos.z;
                    if (dx * dx + dz * dz < 3.4f * 3.4f && car.onGround)
                    {
                        car.boost = Mathf.Min(100f, car.boost + (pad.full ? 100f : 12f));
                        pad.ready = pad.full ? 10f : 4f;
                    }
                }
            }
        }

        static int CheckGoal(WorldSnapshot w)
        {
            var p = w.ball.pos;
            if (Mathf.Abs(p.x) > SimConstants.GoalHalfW) return -1;
            if (p.y > SimConstants.GoalH) return -1;
            if (p.z > SimConstants.HalfL + 0.8f) return 0;
            if (p.z < -SimConstants.HalfL - 0.8f) return 1;
            return -1;
        }

        static Actions BotActions(WorldSnapshot w, CarState car)
        {
            var ball = w.ball;
            float ownGoalZ = car.team == 0 ? SimConstants.HalfL : -SimConstants.HalfL;
            float oppGoalZ = -ownGoalZ;
            float toBallX = ball.pos.x - car.pos.x;
            float toBallZ = ball.pos.z - car.pos.z;
            float dist = Mathf.Sqrt(toBallX * toBallX + toBallZ * toBallZ);
            bool defending = Mathf.Sign(ball.pos.z - ownGoalZ) == Mathf.Sign(car.pos.z - ownGoalZ)
                && Mathf.Abs(ball.pos.z - ownGoalZ) < 28f;
            float tx = ball.pos.x + ball.vel.x * 0.35f;
            float tz = ball.pos.z + ball.vel.z * 0.35f;
            if (defending && dist > 14f)
            {
                tx = ball.pos.x * 0.45f;
                tz = ownGoalZ * 0.72f;
            }
            else tz += Mathf.Sign(oppGoalZ) * 2.4f;
            float wantX = tx - car.pos.x;
            float wantZ = tz - car.pos.z;
            float wantYaw = Mathf.Atan2(-wantX, -wantZ);
            float err = wantYaw - car.yaw;
            while (err > Mathf.PI) err -= Mathf.PI * 2f;
            while (err < -Mathf.PI) err += Mathf.PI * 2f;
            float steer = Mathf.Clamp(err * 2.2f, -1f, 1f);
            bool aligned = Mathf.Abs(err) < 0.45f;
            return new Actions
            {
                throttle = aligned ? 1f : 0.55f,
                steer = steer,
                pitch = !car.onGround ? Mathf.Clamp((ball.pos.y - car.pos.y) * 0.25f, -1f, 1f) : 0f,
                boost = aligned && dist > 10f && car.boost > 8f,
                jump = ball.pos.y > 2.5f && dist < 8f && car.onGround,
            };
        }

        static CarState KickoffCar(int id, int team, bool isPlayer, string name, string livery, string peerId)
        {
            float lane = ((id % 3) - 1) * 6f;
            float z = team == 0 ? 24f : -24f;
            return new CarState
            {
                id = id,
                peerId = peerId,
                team = team,
                isPlayer = isPlayer,
                remote = false,
                name = name,
                livery = livery,
                pos = new Vec3(lane, SimConstants.CarHeight, z),
                vel = new Vec3(),
                yaw = team == 0 ? 0f : Mathf.PI,
                pitch = 0,
                boost = 33,
                onGround = true,
                jumpsLeft = 2,
            };
        }

        static BoostPadState[] MakePads()
        {
            return new[]
            {
                Pad(18, 18, false), Pad(-18, 18, false), Pad(18, -18, false), Pad(-18, -18, false),
                Pad(0, 32, false), Pad(0, -32, false),
                Pad(32, 48, true), Pad(-32, 48, true), Pad(32, -48, true), Pad(-32, -48, true),
            };
        }

        static BoostPadState Pad(float x, float z, bool full) =>
            new BoostPadState { pos = new Vec3(x, 0.05f, z), full = full, ready = 0 };
    }
}
