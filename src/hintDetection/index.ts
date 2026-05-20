export type { Candidates, HintLocation, HintResult, HintTechnique, HintTechniqueTier } from "./types";
export { computeCandidates, TECHNIQUE_DISPLAY_NAMES, TECHNIQUE_TO_TIER } from "./types";

export { detectNakedSingle, detectHiddenSingle } from "./singles";
export {
  detectNakedPair,
  detectNakedTriple,
  detectNakedQuad,
  detectHiddenPair,
  detectHiddenTriple,
  detectHiddenQuad,
} from "./ntuples";
export { detectPointingPairOrBoxLine } from "./intersections";
export { detectXWing, detectSwordfish, detectJellyfish } from "./fish";
export { detectXYWing, detectXYZWing, detectWWing } from "./wings";
export {
  detectSkyscraper,
  detect2StringKite,
  detectEmptyRectangle,
} from "./singleDigitPatterns";
export { detectUniqueRectangle, detectBugPlusOne } from "./uniqueness";
export { detectSimpleColoring } from "./coloring";
