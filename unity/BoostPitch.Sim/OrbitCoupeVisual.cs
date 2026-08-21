using UnityEngine;

namespace BoostPitch.Sim
{
    /// <summary>Primitive Orbit coupe: black body, cyan bars. No red brick. Matches the web lock.</summary>
    public static class OrbitCoupeVisual
    {
        public static void Attach(Transform root)
        {
            if (root.Find("Body")) return;
            var paint = Mat(new Color(0.08f, 0.07f, 0.06f), 0.72f, 0.32f);
            var chrome = Mat(new Color(0.77f, 0.80f, 0.83f), 0.96f, 0.14f);
            var cyan = Mat(new Color(0.18f, 0.90f, 0.84f), 0.2f, 0.18f);
            cyan.EnableKeyword("_EMISSION");
            cyan.SetColor("_EmissionColor", new Color(0.18f, 0.90f, 0.84f) * 2.2f);
            var glass = Mat(new Color(0.03f, 0.06f, 0.09f), 0.92f, 0.06f);

            Box(root, "Body", paint, new Vector3(0f, 0.38f, 0.05f), new Vector3(1.85f, 0.42f, 4.2f));
            Box(root, "Cabin", paint, new Vector3(0f, 0.78f, 0.35f), new Vector3(1.55f, 0.38f, 1.7f));
            Box(root, "Glass", glass, new Vector3(0f, 0.82f, -0.35f), new Vector3(1.4f, 0.28f, 0.08f));
            Box(root, "BarL", cyan, new Vector3(-0.82f, 0.28f, 0.1f), new Vector3(0.06f, 0.08f, 3.4f));
            Box(root, "BarR", cyan, new Vector3(0.82f, 0.28f, 0.1f), new Vector3(0.06f, 0.08f, 3.4f));
            Box(root, "Grill", chrome, new Vector3(0f, 0.32f, -2.05f), new Vector3(1.4f, 0.22f, 0.12f));
            Wheel(root, "FL", chrome, new Vector3(-0.85f, 0.28f, -1.25f));
            Wheel(root, "FR", chrome, new Vector3(0.85f, 0.28f, -1.25f));
            Wheel(root, "RL", chrome, new Vector3(-0.85f, 0.28f, 1.35f));
            Wheel(root, "RR", chrome, new Vector3(0.85f, 0.28f, 1.35f));
        }

        static void Box(Transform root, string name, Material mat, Vector3 pos, Vector3 scale)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(root, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            KillCol(go);
        }

        static void Wheel(Transform root, string name, Material mat, Vector3 pos)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = name;
            go.transform.SetParent(root, false);
            go.transform.localPosition = pos;
            go.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
            go.transform.localScale = new Vector3(0.56f, 0.12f, 0.56f);
            go.GetComponent<Renderer>().sharedMaterial = mat;
            KillCol(go);
        }

        static void KillCol(GameObject go)
        {
            var col = go.GetComponent<Collider>();
            if (!col) return;
            if (Application.isPlaying) Object.Destroy(col);
            else Object.DestroyImmediate(col);
        }

        static Material Mat(Color c, float metal, float rough)
        {
            var sh = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var m = new Material(sh) { color = c };
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metal);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 1f - rough);
            return m;
        }
    }
}
