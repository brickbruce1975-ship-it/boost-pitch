using UnityEngine;

namespace BoostPitch.Sim
{
    /// <summary>
    /// MCP analog of the official Unity spaceship demo (video 3:31).
    /// Empty coupe + this script + Rigidbody = driveable Orbit car.
    /// Physics come from WorldStepper (same as src/game/sim.ts). A = left. No WheelCollider.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public class OrbitCoupeDriver : MonoBehaviour
    {
        public string DriverName = SimConstants.DefaultDriver;
        public float Yaw;
        public float Boost = 33f;

        Rigidbody _rb;
        bool _grounded = true;
        bool _jumpQueued;
        readonly CarState _car = new CarState
        {
            name = SimConstants.DefaultDriver,
            livery = SimConstants.DefaultLivery,
            peerId = "unity-local",
            isPlayer = true,
            onGround = true,
            jumpsLeft = 2,
            boost = 33f,
        };

        void Awake()
        {
            _rb = GetComponent<Rigidbody>();
            _rb.mass = SimConstants.Mass;
            _rb.interpolation = RigidbodyInterpolation.Interpolate;
            _rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
            _rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            Time.fixedDeltaTime = SimConstants.Dt;
            _car.name = DriverName;
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.JoystickButton0))
                _jumpQueued = true;
        }

        void FixedUpdate()
        {
            float dt = Time.fixedDeltaTime;
            var a = new Actions();
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) a.throttle += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) a.throttle -= 1f;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) a.steer += 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) a.steer -= 1f;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) a.pitch += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) a.pitch -= 1f;
            if (!_car.onGround)
            {
                a.pitch = a.throttle;
            }
            a.boost = (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift)) && _car.boost > 1f;
            a.jump = _jumpQueued;

            var v = _rb.linearVelocity;
            var p = _rb.position;
            _car.pos = new Vec3(p.x, p.y, p.z);
            _car.vel = new Vec3(v.x, v.y, v.z);
            _car.yaw = Yaw;
            _car.boost = Boost;
            _car.onGround = _grounded;

            if (_car.onGround) WorldStepper.ApplyTires(_car, a, dt);
            else WorldStepper.StepAir(_car, a, dt);
            _car.jumpHeld = a.jump;

            Yaw = _car.yaw;
            Boost = _car.boost;
            _grounded = _car.onGround;
            _rb.linearVelocity = new Vector3(_car.vel.x, _car.vel.y, _car.vel.z);
            transform.rotation = Quaternion.Euler(0f, Yaw * Mathf.Rad2Deg, 0f);
            _jumpQueued = false;
        }

        void OnCollisionStay(Collision c)
        {
            foreach (var n in c.contacts)
            {
                if (n.normal.y > 0.55f) _grounded = true;
            }
        }

        void OnCollisionExit(Collision c) => _grounded = false;
    }
}
