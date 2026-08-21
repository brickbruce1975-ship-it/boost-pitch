using UnityEngine;

namespace BoostPitch.Sim
{
    /// <summary>Builds the Boost Pitch field from SimConstants. Safe for MCP to add to an empty scene.</summary>
    public class PitchArenaBuilder : MonoBehaviour
    {
        void Awake() => Build();

        public void Build()
        {
            if (transform.Find("PitchFloor")) return;

            var floor = Quad("PitchFloor", SimConstants.HalfW * 2f, SimConstants.HalfL * 2f, new Color(0.04f, 0.18f, 0.16f));
            floor.transform.rotation = Quaternion.Euler(90f, 0f, 0f);

            Wall("WallN", 0f, SimConstants.WallH * 0.5f, -SimConstants.HalfL, SimConstants.HalfW * 2f, SimConstants.WallH, 1.2f);
            Wall("WallS", 0f, SimConstants.WallH * 0.5f, SimConstants.HalfL, SimConstants.HalfW * 2f, SimConstants.WallH, 1.2f);
            Wall("WallW", -SimConstants.HalfW, SimConstants.WallH * 0.5f, 0f, 1.2f, SimConstants.WallH, SimConstants.HalfL * 2f);
            Wall("WallE", SimConstants.HalfW, SimConstants.WallH * 0.5f, 0f, 1.2f, SimConstants.WallH, SimConstants.HalfL * 2f);

            Goal("CyanGoal", 0f, SimConstants.GoalH * 0.5f, -SimConstants.HalfL - 0.4f, new Color(0.18f, 0.9f, 0.84f, 0.35f));
            Goal("AmberGoal", 0f, SimConstants.GoalH * 0.5f, SimConstants.HalfL + 0.4f, new Color(1f, 0.54f, 0.24f, 0.35f));

            var ball = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            ball.name = "Ball";
            ball.transform.SetParent(transform, false);
            ball.transform.position = new Vector3(0f, SimConstants.BallRadius, 0f);
            ball.transform.localScale = Vector3.one * (SimConstants.BallRadius * 2f);
            var brb = ball.AddComponent<Rigidbody>();
            brb.mass = 0.6f;
            brb.linearDamping = 0.12f;
            brb.interpolation = RigidbodyInterpolation.Interpolate;

            var light = new GameObject("KeyLight");
            light.transform.SetParent(transform, false);
            var l = light.AddComponent<Light>();
            l.type = LightType.Directional;
            l.intensity = 1.15f;
            light.transform.rotation = Quaternion.Euler(38f, 40f, 0f);
        }

        GameObject Quad(string name, float w, float d, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = name;
            go.transform.SetParent(transform, false);
            go.transform.localScale = new Vector3(w, d, 1f);
            Tint(go, c);
            return go;
        }

        void Wall(string name, float x, float y, float z, float sx, float sy, float sz)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(transform, false);
            go.transform.position = new Vector3(x, y, z);
            go.transform.localScale = new Vector3(sx, sy, sz);
            Tint(go, new Color(0.08f, 0.12f, 0.16f));
        }

        void Goal(string name, float x, float y, float z, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(transform, false);
            go.transform.position = new Vector3(x, y, z);
            go.transform.localScale = new Vector3(SimConstants.GoalHalfW * 2f, SimConstants.GoalH, SimConstants.GoalDepth);
            Tint(go, c);
            var col = go.GetComponent<Collider>();
            if (col) col.isTrigger = true;
        }

        static void Tint(GameObject go, Color c)
        {
            var r = go.GetComponent<Renderer>();
            if (!r) return;
            r.sharedMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"))
            {
                color = c
            };
        }
    }
}
