using UnityEngine;

namespace BoostPitch.Sim
{
    /// <summary>
    /// Headless match tick on WorldStepper. Optional Transform views for cars/ball.
    /// Attach to an empty GameObject after the 3:31 coupe path if you want a full game,
    /// not just a driveable body. architecture_only until Play Mode in the Editor.
    /// </summary>
    public class OrbitMatchRunner : MonoBehaviour
    {
        public Transform[] CarViews;
        public Transform BallView;
        public string DriverName = SimConstants.DefaultDriver;
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
            if (_world == null) KickOff();
        }

        void FixedUpdate()
        {
            if (_world == null || _world.phase == "menu" || _world.phase == "over") return;
            WorldStepper.Step(_world, ReadActions(), Time.fixedDeltaTime);
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
