using System.Collections;
using UnityEngine;

namespace BoostPitch.Sim
{
    /// <summary>
    /// The Orbit full masters. Same ids / order as web src/game/orbitMusic.ts
    /// and Unity OrbitAudio.cs. Play once. Do not loop. Do not use 30s previews.
    /// </summary>
    [RequireComponent(typeof(AudioSource))]
    public class OrbitAlbumPlayer : MonoBehaviour
    {
        public static readonly string[] TrackIds =
        {
            "suit-up",
            "float-easy",
            "spaceage",
            "astronaut",
            "witness",
            "the-shimmer",
            "in-the-glass",
        };

        public const float MusicVol = 0.82f;
        public const float FadeSec = 2.5f;

        AudioSource _src;
        int _index;
        bool _started;

        void Awake()
        {
            _src = GetComponent<AudioSource>();
            _src.playOnAwake = false;
            _src.loop = false;
            _src.spatialBlend = 0f;
            _src.volume = MusicVol;
        }

        void Start() => PlayIndex(0);

        void Update()
        {
            if (_started && _src.clip && !_src.isPlaying)
            {
                _started = false;
                if (_index < TrackIds.Length - 1) PlayIndex(_index + 1);
            }
        }

        public void PlayIndex(int i)
        {
            _index = Mathf.Clamp(i, 0, TrackIds.Length - 1);
            var id = TrackIds[_index];
            var clip = Resources.Load<AudioClip>("OrbitAudio/" + id);
            if (!clip)
            {
                Debug.Log("[BoostPitch] Orbit music silent — drop full masters in Resources/OrbitAudio/" + id + ".wav");
                return;
            }
            _src.loop = false;
            _src.clip = clip;
            _src.volume = MusicVol;
            _src.Play();
            _started = true;
            Debug.Log("[BoostPitch] music_play id=" + id + " len=" + clip.length.ToString("0.0") + "s loop=false");
        }

        public void FadeOut() => StartCoroutine(FadeRoutine());

        IEnumerator FadeRoutine()
        {
            var start = _src.volume;
            var t = 0f;
            while (t < FadeSec)
            {
                t += Time.unscaledDeltaTime;
                _src.volume = Mathf.Lerp(start, 0f, t / FadeSec);
                yield return null;
            }
            _src.Stop();
            _src.volume = MusicVol;
        }
    }
}
