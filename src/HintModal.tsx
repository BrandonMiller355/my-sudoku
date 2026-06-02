import { useEffect, useMemo, useState } from "react";
import type { CellState } from "./types";
import {
  computeCandidates,
  detectNakedSingle,
  detectHiddenSingle,
  detectNakedPair,
  detectNakedTriple,
  detectNakedQuad,
  detectHiddenPair,
  detectHiddenTriple,
  detectHiddenQuad,
  detectPointingPairOrBoxLine,
  detectXWing,
  detectSwordfish,
  detectJellyfish,
  detectXYWing,
  detectXYZWing,
  detectWWing,
  detectSkyscraper,
  detect2StringKite,
  detectEmptyRectangle,
  detectUniqueRectangle,
  detectBugPlusOne,
  detectSimpleColoring,
  TECHNIQUE_DISPLAY_NAMES,
  TECHNIQUE_TO_TIER,
  type HintTechnique,
  type HintTechniqueTier,
  type HintResult,
  type HintLocation,
} from "./hintDetection";

type ProgressionState = "none" | "presence" | "count" | "location";

interface HintModalProps {
  grid: CellState[];
  onClose: () => void;
}

const TIER_ORDER: HintTechniqueTier[] = ["singles", "n-tuples", "intersections", "fish", "wings", "single-digit", "uniqueness", "coloring"];

const TECHNIQUES: HintTechnique[] = [
  "naked-single",
  "hidden-single",
  "naked-pair",
  "naked-triple",
  "naked-quad",
  "hidden-pair",
  "hidden-triple",
  "hidden-quad",
  "pointing-pair-or-box-line",
  "x-wing",
  "swordfish",
  "jellyfish",
  "xy-wing",
  "xyz-wing",
  "w-wing",
  "skyscraper",
  "2-string-kite",
  "empty-rectangle",
  "unique-rectangle",
  "bug-plus-one",
  "simple-coloring",
];

function formatLocation(location: HintLocation): string {
  switch (location.type) {
    case "single-unit": {
      const unitNames = { row: "Row", col: "Column", box: "Box" };
      return `${unitNames[location.unitType]} ${location.index + 1}`;
    }
    case "fish-details": {
      const baseLabel = location.baseUnitType === "row" ? "Rows" : "Columns";
      const coverLabel = location.baseUnitType === "row" ? "Columns" : "Rows";
      return `Digit ${location.digit}: ${baseLabel} ${location.baseLines.map((i) => i + 1).join(", ")} / ${coverLabel} ${location.coverLines.map((i) => i + 1).join(", ")}`;
    }
    case "box-set": {
      return `Boxes ${location.boxIndices.map((i) => i + 1).join(", ")}`;
    }
    case "single-digit": {
      return `Digit ${location.digit}, Box ${location.boxIndex + 1}`;
    }
    case "wing-cells": {
      return location.cells
        .map((c) => {
          const row = Math.floor(c.index / 9) + 1;
          const col = (c.index % 9) + 1;
          return `R${row}C${col} = {${c.candidates.join(",")}}`;
        })
        .join("\n");
    }
    default: {
      const _exhaustive: never = location;
      return _exhaustive;
    }
  }
}

function TechniqueRow({
  technique,
  progression,
  result,
  onAsk,
  onHowMany,
  onWhere,
}: {
  technique: HintTechnique;
  progression: ProgressionState;
  result: HintResult | null;
  onAsk: () => void;
  onHowMany: () => void;
  onWhere: () => void;
}) {
  const displayName = TECHNIQUE_DISPLAY_NAMES[technique];

  return (
    <div className="border-b border-slate-200 py-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{displayName}</span>
        <div className="flex items-center gap-2">
          {progression === "none" && (
            <button
              onClick={onAsk}
              className="rounded-lg border border-sky-500 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-200 dark:hover:bg-sky-500/30"
            >
              Ask
            </button>
          )}
          {progression === "presence" && (
            <>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {result?.present ? "Present" : "Not present"}
              </span>
              {result?.present && (
                <button
                  onClick={onHowMany}
                  className="rounded-lg border border-sky-500 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-200 dark:hover:bg-sky-500/30"
                >
                  How many?
                </button>
              )}
            </>
          )}
          {progression === "count" && (
            <>
              <span className="text-sm text-slate-600 dark:text-slate-300">{result?.count}</span>
              <button
                onClick={onWhere}
                className="rounded-lg border border-sky-500 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-200 dark:hover:bg-sky-500/30"
              >
                Where?
              </button>
            </>
          )}
          {progression === "location" && (
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {result?.locations.map((loc, idx) => (
                <div key={idx} className={idx > 0 ? "mt-2" : ""}>
                  {loc.type === "wing-cells"
                    ? loc.cells.map((c, ci) => {
                        const row = Math.floor(c.index / 9) + 1;
                        const col = (c.index % 9) + 1;
                        return (
                          <div key={ci}>
                            R{row}C{col} = {`{${c.candidates.join(",")}}`}
                          </div>
                        );
                      })
                    : formatLocation(loc)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HintModal({ grid, onClose }: HintModalProps) {
  const [progression, setProgression] = useState<Map<HintTechnique, ProgressionState>>(
    new Map(TECHNIQUES.map((t) => [t, "none"]))
  );
  const [results, setResults] = useState<Map<HintTechnique, HintResult>>(new Map());

  const candidates = useMemo(() => computeCandidates(grid), [grid]);

  const detectors = useMemo(
    () => ({
      "naked-single": () => detectNakedSingle(candidates),
      "hidden-single": () => detectHiddenSingle(candidates),
      "naked-pair": () => detectNakedPair(candidates),
      "naked-triple": () => detectNakedTriple(candidates),
      "naked-quad": () => detectNakedQuad(candidates),
      "hidden-pair": () => detectHiddenPair(candidates),
      "hidden-triple": () => detectHiddenTriple(candidates),
      "hidden-quad": () => detectHiddenQuad(candidates),
      "pointing-pair-or-box-line": () => detectPointingPairOrBoxLine(candidates),
      "x-wing": () => detectXWing(candidates),
      swordfish: () => detectSwordfish(candidates),
      jellyfish: () => detectJellyfish(candidates),
      "xy-wing": () => detectXYWing(candidates),
      "xyz-wing": () => detectXYZWing(candidates),
      "w-wing": () => detectWWing(candidates, grid),
      skyscraper: () => detectSkyscraper(candidates),
      "2-string-kite": () => detect2StringKite(candidates),
      "empty-rectangle": () => detectEmptyRectangle(candidates, grid),
      "unique-rectangle": () => detectUniqueRectangle(candidates),
      "bug-plus-one": () => detectBugPlusOne(candidates, grid),
      "simple-coloring": () => detectSimpleColoring(candidates, grid),
    }),
    [candidates, grid]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleAsk = (technique: HintTechnique) => {
    const detector = detectors[technique as keyof typeof detectors];
    const result = detector?.() || { present: false, count: 0, locations: [] };
    setResults((prev) => new Map(prev).set(technique, result));
    setProgression((prev) => new Map(prev).set(technique, "presence"));
  };

  const handleHowMany = (technique: HintTechnique) => {
    setProgression((prev) => new Map(prev).set(technique, "count"));
  };

  const handleWhere = (technique: HintTechnique) => {
    setProgression((prev) => new Map(prev).set(technique, "location"));
  };

  const groupedTechniques = useMemo(() => {
    const groups = new Map<HintTechniqueTier, HintTechnique[]>();
    for (const tier of TIER_ORDER) {
      groups.set(tier, TECHNIQUES.filter((t) => TECHNIQUE_TO_TIER[t] === tier));
    }
    return groups;
  }, []);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hint-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]"
        aria-label="Close hint modal"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[80vh] overflow-y-auto">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="hint-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
            Hint System
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {Array.from(groupedTechniques).map(([tier, techniques]) => (
            <div key={tier}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {tier === "singles"
                  ? "Singles"
                  : tier === "n-tuples"
                  ? "N-Tuples"
                  : tier === "intersections"
                  ? "Intersections"
                  : tier === "fish"
                  ? "Fish"
                  : tier === "wings"
                  ? "Wings"
                  : tier === "single-digit"
                  ? "Single-Digit Patterns"
                  : tier === "uniqueness"
                  ? "Uniqueness"
                  : "Coloring"}
              </h3>
              <div className="space-y-0">
                {techniques.map((technique) => (
                  <TechniqueRow
                    key={technique}
                    technique={technique}
                    progression={progression.get(technique) || "none"}
                    result={results.get(technique) || null}
                    onAsk={() => handleAsk(technique)}
                    onHowMany={() => handleHowMany(technique)}
                    onWhere={() => handleWhere(technique)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
