using UnityEngine;

namespace BoostPitch.Sim
{
    public class OrbitChaseCam : MonoBehaviour
    {
        public Transform Target;
        public float Distance = 7.2f;
        public float Height = 2.8f;
        public float Follow = 8f;
        public float BaseFov = 64f;
        public float BoostFov = 74f;

        Camera _cam;
        float _trauma;

        void Awake()
        {
            _cam = GetComponent<Camera>();
        }

        public void AddTrauma(float v)
        {
            _trauma = Mathf.Min(1f, _trauma + v);
        }

        void LateUpdate()
        {
            if (!Target) return;
            var driver = Target.GetComponent<OrbitCoupeDriver>();
            float yaw = driver ? driver.Yaw : Target.eulerAngles.y * Mathf.Deg2Rad;
            SimConstants.Forward(yaw, out float fx, out float fz);
            var back = new Vector3(-fx, 0f, -fz);
            var desired = Target.position + Vector3.up * Height + back * Distance;
            transform.position = Vector3.Lerp(transform.position, desired, 1f - Mathf.Exp(-Follow * Time.deltaTime));
            transform.LookAt(Target.position + Vector3.up * 0.9f);

            _trauma = Mathf.Max(0f, _trauma - Time.deltaTime * 1.6f);
            float shake = _trauma * _trauma;
            if (shake > 0.001f)
            {
                transform.position += new Vector3(
                    Mathf.Sin(Time.time * 47.1f) * shake * 0.35f,
                    Mathf.Cos(Time.time * 39.3f) * shake * 0.22f,
                    0f);
            }

            if (_cam)
            {
                bool boosting = driver && (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift));
                float fov = boosting ? BoostFov : BaseFov;
                _cam.fieldOfView = Mathf.Lerp(_cam.fieldOfView, fov, 1f - Mathf.Exp(-8f * Time.deltaTime));
            }
        }
    }
}
