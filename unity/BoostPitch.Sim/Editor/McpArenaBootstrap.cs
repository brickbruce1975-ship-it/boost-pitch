#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace BoostPitch.Sim.Editor
{
    /// <summary>
    /// Does what the official Unity MCP video does at 3:31, for Boost Pitch:
    /// empty scene → coupe + Rigidbody + driver + camera + album + Play.
    /// Menu: Boost Pitch / MCP / Assemble Playable Arena
    /// </summary>
    public static class McpArenaBootstrap
    {
        const string ScenePath = "Assets/BoostPitch.Sim/PitchArena.unity";

        [MenuItem("Boost Pitch/MCP/Assemble Playable Arena")]
        public static void Assemble()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "PitchArena";

            var arenaGo = new GameObject("PitchArena");
            arenaGo.AddComponent<PitchArenaBuilder>().Build();

            var coupe = new GameObject("OrbitCoupe");
            coupe.transform.position = new Vector3(0f, SimConstants.CarHeight, 24f);
            var rb = coupe.AddComponent<Rigidbody>();
            rb.mass = 1.2f;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
            var capsule = coupe.AddComponent<CapsuleCollider>();
            capsule.radius = SimConstants.CarRadius;
            capsule.height = 1.4f;
            capsule.direction = 2;
            var driver = coupe.AddComponent<OrbitCoupeDriver>();
            driver.DriverName = SimConstants.DefaultDriver;
            driver.Yaw = 0f;
            OrbitCoupeVisual.Attach(coupe.transform);
            coupe.AddComponent<AudioSource>();
            coupe.AddComponent<OrbitAlbumPlayer>();

            var camGo = new GameObject("ChaseCamera");
            camGo.AddComponent<Camera>();
            camGo.AddComponent<AudioListener>();
            var chase = camGo.AddComponent<OrbitChaseCam>();
            chase.Target = coupe.transform;
            camGo.transform.position = new Vector3(0f, 3.2f, 31f);

            EditorSceneManager.MarkSceneDirty(scene);
            System.IO.Directory.CreateDirectory("Assets/BoostPitch.Sim");
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log("[BoostPitch] MCP arena assembled. Play Mode: WASD, A=left, Space jump, Shift boost. Suit Up if Resources/OrbitAudio/suit-up is present.");
        }

        [MenuItem("Boost Pitch/MCP/Print Kickoff Prompt")]
        public static void PrintPrompt()
        {
            Debug.Log(
                "MCP prompt: There is an empty PitchArena. Create OrbitCoupe at (0, 0.42, 24), " +
                "attach OrbitCoupeDriver + Rigidbody (freeze rot X/Z), OrbitAlbumPlayer, chase camera. " +
                "No WheelCollider. A must steer left. Play Suit Up once, do not loop. Hit Play and verify."
            );
        }
    }
}
#endif
