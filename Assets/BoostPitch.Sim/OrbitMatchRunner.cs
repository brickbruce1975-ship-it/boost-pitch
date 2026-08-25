using UnityEngine;

namespace BoostPitch.Sim
{
    /// <summary>
    /// Primary Unity runtime host for the engine-neutral WorldStepper simulation.
    /// It owns the fixed tick, kickoff, ball, bot, score, and view synchronization.
    /// Presentation components consume this state; they do not create a second physics story.
    /// </summary>
    [DefaultExecutionOrder(-20)]
    public class OrbitMatchRunner : MonoBehaviour
    {
        public Transform[] CarViews;
        public Transform BallView;
        public string DriverName = SimConstants.DefaultDriver;
        public bool AutoKickOff = true;
        public bool PauseWhenUnfocused = true;
        WorldSnapshot _world;

        void Awake()
        {
            Time.fixedDeltaTime = SimConstants.Dt;
        }

        public WorldSnapshot World => _world;

        public void KickOff()
        {
            _world = WorldStepper.CreateSolo(DriverName, SimConstants.DefaultLivery);
            WorldStepper.StartMatch(_world);
        }

        void Start()
        {
            if (AutoKickOff && _world == null) KickOff();
            SyncViews();
        }

        void FixedUpdate()
        {
            if (_world == null || _world.phase == "menu" || _world.phase == "over") return;
            if (PauseWhenUnfocused && !Application.isFocused) return;
            WorldStepper.Step(_world, ReadActions(), SimConstants.Dt);
            SyncViews();
        }

        static Actions ReadActions()
        {
            var a = new Actions();
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) a.throttle += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) a.throttle -= 1f;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) a.steer += 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) a.steer -= 1f;
            a.boost = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
            a.jump = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.JoystickButton0);
            if (!(a.throttle == 0f && a.steer == 0f && !a.boost && !a.jump) &&
                (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.DownArrow)))
            {
                // in air W/S is pitch — WorldStepper.StepAir reads pitch; ground ignores it
                a.pitch = a.throttle;
            }
            return a;
        }

        public void SetDriverIdentity(string driverName)
        {
            DriverName = string.IsNullOrWhiteSpace(driverName) ? SimConstants.DefaultDriver : driverName.Trim();
            if (_world?.cars != null && _world.cars.Length > 0) _world.cars[0].name = DriverName;
        }

        public void RestartMatch()
        {
            KickOff();
            SyncViews();
        }

        void SyncViews()
        {
            if (_world.cars != null && CarViews != null)
            {
                int n = Mathf.Min(_world.cars.Length, CarViews.Length);
                for (int i = 0; i < n; i++)
                {
                    if (!CarViews[i]) continue;
                    var c = _world.cars[i];
                    CarViews[i].position = new Vector3(c.pos.x, c.pos.y, c.pos.z);
                    CarViews[i].rotation = Quaternion.Euler(c.pitch * Mathf.Rad2Deg, c.yaw * Mathf.Rad2Deg, 0f);
                }
            }
            if (BallView && _world.ball != null)
            {
                var b = _world.ball.pos;
                BallView.position = new Vector3(b.x, b.y, b.z);
            }
        }
    }
}
