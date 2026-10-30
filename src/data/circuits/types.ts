/** F1DB circuit slug, e.g. `silverstone`. */
export type CircuitSlug = string;

/** One configuration of a circuit, as drawn on the source map. */
export interface CircuitLayout {
  /** Year ranges `[from, to]` this shape was used in; `to = 9999` means "still in use". */
  eras: [number, number][];
  /** Lap length in kilometres. */
  lengthKm: number;
  /** Number of turns. */
  turns: number;
  /** Drive direction around the lap. */
  direction: 'clockwise' | 'anticlockwise';
  /** SVG path in a 500 × 500 viewBox. */
  d: string;
}
