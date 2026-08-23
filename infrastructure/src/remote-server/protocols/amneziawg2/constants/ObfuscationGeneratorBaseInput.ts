import type { GeneratorInput } from "../vendor/awg-architect/engines/awg/generator/types"

export const ObfuscationGeneratorBaseInput = {
  version: "2.0",
  clientId: "amneziavpn",
  clientRelease: null,
  customHost: "",
  hostRegion: "any",
  mimicAll: false,
  useTagC: false,
  useTagT: true,
  useTagR: true,
  useTagRC: true,
  useTagRD: true,
  useBrowserFp: false,
  browserProfile: "",
  routerMode: false,
  useExtremeMax: false,
  iterCount: 0,
  useHeaderProtection: false,
  useContentPadding: false,
  useRandomTimings: false,
} as const satisfies Partial<GeneratorInput>
