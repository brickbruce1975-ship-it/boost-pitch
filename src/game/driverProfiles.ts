import type { Livery } from "./types";

export const DRIVER_THEME_IDS = ["orbit_classic", "night_shift", "signal_fade"] as const;
export type DriverThemeId = (typeof DRIVER_THEME_IDS)[number];

export type ThemeCssTokens = Readonly<{
  accent: string;
  accentSoft: string;
  accentInk: string;
  surfaceTint: string;
  lineTint: string;
}>;

export type DriverProfile = Readonly<{
  id: "brick_bruce";
  themeId: DriverThemeId;
  displayName: "Brick Bruce";
  themeName: string;
  tagline: string;
  defaultLivery: Livery;
  portraitSrc: string;
  liveryAssetSrc: string;
  css: ThemeCssTokens;
}>;

const ORBIT_CLASSIC_PORTRAIT = "/orbit/themes/orbit-classic-portrait.svg";
const ORBIT_CLASSIC_LIVERY = "/orbit/themes/orbit-classic-livery.svg";

export const BRICK_BRUCE_THEMES: Record<DriverThemeId, DriverProfile> = {
  orbit_classic: {
    id: "brick_bruce",
    themeId: "orbit_classic",
    displayName: "Brick Bruce",
    themeName: "Orbit Classic",
    tagline: "THE ORIGINAL ORBIT DRIVER",
    defaultLivery: "brick",
    portraitSrc: ORBIT_CLASSIC_PORTRAIT,
    liveryAssetSrc: ORBIT_CLASSIC_LIVERY,
    css: {
      accent: "#2EE6D6",
      accentSoft: "rgba(46, 230, 214, 0.15)",
      accentInk: "#071F25",
      surfaceTint: "#183541",
      lineTint: "rgba(46, 230, 214, 0.46)",
    },
  },
  night_shift: {
    id: "brick_bruce",
    themeId: "night_shift",
    displayName: "Brick Bruce",
    themeName: "Night Shift",
    tagline: "LAST LAP. FIRST LIGHT.",
    defaultLivery: "brick",
    portraitSrc: ORBIT_CLASSIC_PORTRAIT,
    liveryAssetSrc: ORBIT_CLASSIC_LIVERY,
    css: {
      accent: "#8CD8FF",
      accentSoft: "rgba(140, 216, 255, 0.15)",
      accentInk: "#08151E",
      surfaceTint: "#101D29",
      lineTint: "rgba(140, 216, 255, 0.46)",
    },
  },
  signal_fade: {
    id: "brick_bruce",
    themeId: "signal_fade",
    displayName: "Brick Bruce",
    themeName: "Signal Fade",
    tagline: "TUNE THE STATIC.",
    defaultLivery: "brick",
    portraitSrc: ORBIT_CLASSIC_PORTRAIT,
    liveryAssetSrc: ORBIT_CLASSIC_LIVERY,
    css: {
      accent: "#2EE6D6",
      accentSoft: "rgba(46, 230, 214, 0.13)",
      accentInk: "#071A20",
      surfaceTint: "#172229",
      lineTint: "rgba(142, 150, 156, 0.58)",
    },
  },
};

export function themeFor(id: DriverThemeId) {
  return BRICK_BRUCE_THEMES[id];
}
