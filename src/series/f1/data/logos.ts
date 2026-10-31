// Team logos are registered trademarks of their owners. They are shown only to
// identify the team, next to its name, on a non-commercial fan site.
// Files live in public/logos/: only the emblem, cut out of the full logo (viewBox crop),
// shown in a circle in the team color. Every file needs a row here with its source and licence.
// Without a row (or if the file fails to load) the team gets a badge in its color.

interface LogoEntry {
  /** File name in public/logos/, e.g. "ferrari.svg". */
  file: string;
  /** Where the file came from (link). */
  source: string;
  /** Licence or permission that allows using it on this site. */
  license: string;
  /** Owner of the trademark. */
  holder: string;
  /**
   * How the emblem sits on the team-colored circle: 'white' turns it into a white
   * silhouette, 'invert' keeps inner details, 'color' leaves it as is.
   */
  tone: 'white' | 'invert' | 'color';
}

/** Keyed by Jolpica constructorId. */
export const TEAM_LOGOS: Readonly<Record<string, LogoEntry>> = {
  mercedes: {
    file: 'mercedes.svg',
    source: 'https://commons.wikimedia.org/wiki/File:Mercedes-AMG_Petronas_F1_Team_logo_(2026).svg',
    license: 'Public domain (PD-textlogo), товарный знак',
    holder: 'Mercedes-Benz Grand Prix Ltd',
    tone: 'white',
  },
  mclaren: {
    file: 'mclaren.svg',
    source: 'https://commons.wikimedia.org/wiki/File:McLaren_Speedmark.svg',
    license: 'Public domain (PD-textlogo), товарный знак',
    holder: 'McLaren Racing Ltd',
    tone: 'white',
  },
  alpine: {
    file: 'alpine.svg',
    source: 'https://commons.wikimedia.org/wiki/File:Alpine_F1_Team_Logo.svg',
    license: 'Public domain (PD-textlogo), товарный знак',
    holder: 'Alpine Racing',
    tone: 'white',
  },
  williams: {
    file: 'williams.png',
    source: 'https://commons.wikimedia.org/wiki/File:Williams_Racing_Monogram.png',
    license: 'CC BY-SA 4.0, автор DJClements; товарный знак',
    holder: 'Williams Grand Prix Engineering',
    tone: 'white',
  },
  audi: {
    file: 'audi.svg',
    source: 'https://commons.wikimedia.org/wiki/File:Audif1.com_logo17_(cropped).svg',
    license: 'Public domain (PD-textlogo), товарный знак',
    holder: 'Audi AG',
    tone: 'white',
  },
  haas: {
    file: 'haas.svg',
    source: 'https://commons.wikimedia.org/wiki/File:TGR_Haas_F1_Team_Logo_(2026).svg',
    license: 'Public domain (PD-textlogo), товарный знак',
    holder: 'Haas F1 Team',
    tone: 'white',
  },
  ferrari: {
    file: 'ferrari.svg',
    source: 'https://en.wikipedia.org/wiki/File:Scuderia_Ferrari_HP_logo_24.svg',
    license: 'Несвободный (fair use в Википедии)',
    holder: 'Ferrari S.p.A.',
    tone: 'white',
  },
  red_bull: {
    file: 'red_bull.svg',
    source: 'https://en.wikipedia.org/wiki/File:Red_Bull_Racing_Logo_2026.svg',
    license: 'Несвободный (fair use в Википедии)',
    holder: 'Red Bull Racing',
    tone: 'color',
  },
  rb: {
    file: 'rb.svg',
    source: 'https://en.wikipedia.org/wiki/File:VCARB_F1_logo.svg',
    license: 'Несвободный (fair use в Википедии)',
    holder: 'Racing Bulls',
    tone: 'white',
  },
  aston_martin: {
    file: 'aston_martin.png',
    source: 'https://en.wikipedia.org/wiki/File:Aston_Martin_Aramco_2024_logo.png',
    license: 'Несвободный (fair use в Википедии)',
    holder: 'Aston Martin Lagonda',
    tone: 'white',
  },
  cadillac: {
    file: 'cadillac.svg',
    source: 'https://en.wikipedia.org/wiki/File:Cadillac_Formula_1_Team_Logo_(2025).svg',
    license: 'Несвободный (fair use в Википедии)',
    holder: 'General Motors / TWG Motorsports',
    tone: 'invert',
  },
};

/** Short badge text for well-known teams; others get the first letters of their name. */
export const TEAM_ABBR: Readonly<Record<string, string>> = {
  mercedes: 'MER',
  ferrari: 'FER',
  red_bull: 'RBR',
  mclaren: 'MCL',
  aston_martin: 'AMR',
  alpine: 'ALP',
  williams: 'WIL',
  rb: 'RB',
  sauber: 'SAU',
  audi: 'AUD',
  haas: 'HAA',
  cadillac: 'CAD',
  renault: 'REN',
  lotus_f1: 'LOT',
  team_lotus: 'LOT',
  brabham: 'BRA',
  tyrrell: 'TYR',
  toro_rosso: 'STR',
  alphatauri: 'AT',
  racing_point: 'RP',
  force_india: 'FI',
  alfa: 'ALF',
  benetton: 'BEN',
  jordan: 'JOR',
  ligier: 'LIG',
  minardi: 'MIN',
  march: 'MAR',
  bar: 'BAR',
  honda: 'HON',
  toyota: 'TOY',
  jaguar: 'JAG',
  stewart: 'STW',
  bmw_sauber: 'BMW',
  brawn: 'BGP',
  cooper: 'COO',
  brm: 'BRM',
  maserati: 'MAS',
  vanwall: 'VAN',
};
