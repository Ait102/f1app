// Photos of the 2026 cars on Wikimedia Commons (series by Lukas Raich,
// Austrian Grand Prix 2026, CC BY-SA 4.0). The author and licence are read
// from Commons at run time and shown under the photo.

interface CarPhoto {
  /** File name on Commons. */
  file: string;
  /** Car name for the caption. */
  car: string;
}

/** Keyed by Jolpica constructorId. Other teams use their Wikipedia article photo, if any. */
export const CAR_PHOTOS: Readonly<Record<string, CarPhoto>> = {
  mercedes: { file: 'FIA F1 Austria 2026 Nr. 12 Antonelli (1).jpg', car: 'Mercedes W17' },
  ferrari: { file: 'FIA F1 Austria 2026 Nr. 44 Hamilton (1).jpg', car: 'Ferrari SF-26' },
  red_bull: { file: 'FIA F1 Austria 2026 Nr. 3 Verstappen (1).jpg', car: 'Red Bull RB22' },
  mclaren: { file: 'FIA F1 Austria 2026 Nr. 1 Norris (1).jpg', car: 'McLaren MCL40' },
  aston_martin: { file: 'FIA F1 Austria 2026 Nr. 14 Alonso (1).jpg', car: 'Aston Martin AMR26' },
  alpine: { file: 'FIA F1 Austria 2026 Nr. 10 Gasly (1).jpg', car: 'Alpine A526' },
  williams: { file: 'FIA F1 Austria 2026 Nr. 23 Albon (1).jpg', car: 'Williams FW48' },
  rb: { file: 'FIA F1 Austria 2026 Nr. 41 Lindblad (1).jpg', car: 'Racing Bulls VCARB 03' },
  audi: { file: 'FIA F1 Austria 2026 Nr. 27 Hülkenberg (1).jpg', car: 'Audi R26' },
  haas: { file: 'FIA F1 Austria 2026 Nr. 87 Bearman (1).jpg', car: 'Haas VF-26' },
  cadillac: { file: 'FIA F1 Austria 2026 Nr. 11 Perez (1).jpg', car: 'Cadillac MAC-26' },
};

/** Season the photos were taken in (for the caption). */
export const CAR_PHOTOS_SEASON = 2026;
