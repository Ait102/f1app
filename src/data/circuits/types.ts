/** Static circuit shape, generated from F1DB (CC BY 4.0). */
export interface CircuitShape {
  /** Drive direction around the lap. */
  direction: 'clockwise' | 'anticlockwise';
  /** Lap length in kilometres. */
  lengthKm: number;
  /** Number of turns. */
  turns: number;
  /** First season this layout was used in; 0 when F1DB does not say. */
  from: number;
  /** SVG path in a 500 × 500 viewBox. */
  d: string;
}
