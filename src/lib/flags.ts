// Flags for nationalities and circuit countries as they are written by the data source.
// SVGs: flag-icons (MIT). Historical states (East Germany, Rhodesia) have no entry on purpose:
// showing a modern flag for them would be wrong. Generated list — keep it sorted.

import flag_ae from 'flag-icons/flags/4x3/ae.svg?no-inline';
import flag_ar from 'flag-icons/flags/4x3/ar.svg?no-inline';
import flag_at from 'flag-icons/flags/4x3/at.svg?no-inline';
import flag_au from 'flag-icons/flags/4x3/au.svg?no-inline';
import flag_az from 'flag-icons/flags/4x3/az.svg?no-inline';
import flag_be from 'flag-icons/flags/4x3/be.svg?no-inline';
import flag_bh from 'flag-icons/flags/4x3/bh.svg?no-inline';
import flag_br from 'flag-icons/flags/4x3/br.svg?no-inline';
import flag_ca from 'flag-icons/flags/4x3/ca.svg?no-inline';
import flag_ch from 'flag-icons/flags/4x3/ch.svg?no-inline';
import flag_cl from 'flag-icons/flags/4x3/cl.svg?no-inline';
import flag_cn from 'flag-icons/flags/4x3/cn.svg?no-inline';
import flag_co from 'flag-icons/flags/4x3/co.svg?no-inline';
import flag_cz from 'flag-icons/flags/4x3/cz.svg?no-inline';
import flag_de from 'flag-icons/flags/4x3/de.svg?no-inline';
import flag_dk from 'flag-icons/flags/4x3/dk.svg?no-inline';
import flag_es from 'flag-icons/flags/4x3/es.svg?no-inline';
import flag_fi from 'flag-icons/flags/4x3/fi.svg?no-inline';
import flag_fr from 'flag-icons/flags/4x3/fr.svg?no-inline';
import flag_gb from 'flag-icons/flags/4x3/gb.svg?no-inline';
import flag_hk from 'flag-icons/flags/4x3/hk.svg?no-inline';
import flag_hu from 'flag-icons/flags/4x3/hu.svg?no-inline';
import flag_id from 'flag-icons/flags/4x3/id.svg?no-inline';
import flag_ie from 'flag-icons/flags/4x3/ie.svg?no-inline';
import flag_in from 'flag-icons/flags/4x3/in.svg?no-inline';
import flag_it from 'flag-icons/flags/4x3/it.svg?no-inline';
import flag_jp from 'flag-icons/flags/4x3/jp.svg?no-inline';
import flag_kr from 'flag-icons/flags/4x3/kr.svg?no-inline';
import flag_li from 'flag-icons/flags/4x3/li.svg?no-inline';
import flag_ma from 'flag-icons/flags/4x3/ma.svg?no-inline';
import flag_mc from 'flag-icons/flags/4x3/mc.svg?no-inline';
import flag_mx from 'flag-icons/flags/4x3/mx.svg?no-inline';
import flag_my from 'flag-icons/flags/4x3/my.svg?no-inline';
import flag_nl from 'flag-icons/flags/4x3/nl.svg?no-inline';
import flag_nz from 'flag-icons/flags/4x3/nz.svg?no-inline';
import flag_pl from 'flag-icons/flags/4x3/pl.svg?no-inline';
import flag_pt from 'flag-icons/flags/4x3/pt.svg?no-inline';
import flag_qa from 'flag-icons/flags/4x3/qa.svg?no-inline';
import flag_ru from 'flag-icons/flags/4x3/ru.svg?no-inline';
import flag_sa from 'flag-icons/flags/4x3/sa.svg?no-inline';
import flag_se from 'flag-icons/flags/4x3/se.svg?no-inline';
import flag_sg from 'flag-icons/flags/4x3/sg.svg?no-inline';
import flag_th from 'flag-icons/flags/4x3/th.svg?no-inline';
import flag_tr from 'flag-icons/flags/4x3/tr.svg?no-inline';
import flag_us from 'flag-icons/flags/4x3/us.svg?no-inline';
import flag_uy from 'flag-icons/flags/4x3/uy.svg?no-inline';
import flag_ve from 'flag-icons/flags/4x3/ve.svg?no-inline';
import flag_za from 'flag-icons/flags/4x3/za.svg?no-inline';

const FLAGS: Record<string, string> = {
  ae: flag_ae,
  ar: flag_ar,
  at: flag_at,
  au: flag_au,
  az: flag_az,
  be: flag_be,
  bh: flag_bh,
  br: flag_br,
  ca: flag_ca,
  ch: flag_ch,
  cl: flag_cl,
  cn: flag_cn,
  co: flag_co,
  cz: flag_cz,
  de: flag_de,
  dk: flag_dk,
  es: flag_es,
  fi: flag_fi,
  fr: flag_fr,
  gb: flag_gb,
  hk: flag_hk,
  hu: flag_hu,
  id: flag_id,
  ie: flag_ie,
  in: flag_in,
  it: flag_it,
  jp: flag_jp,
  kr: flag_kr,
  li: flag_li,
  ma: flag_ma,
  mc: flag_mc,
  mx: flag_mx,
  my: flag_my,
  nl: flag_nl,
  nz: flag_nz,
  pl: flag_pl,
  pt: flag_pt,
  qa: flag_qa,
  ru: flag_ru,
  sa: flag_sa,
  se: flag_se,
  sg: flag_sg,
  th: flag_th,
  tr: flag_tr,
  us: flag_us,
  uy: flag_uy,
  ve: flag_ve,
  za: flag_za,
};

const NATIONALITY: Record<string, string> = {
  American: 'us',
  Argentine: 'ar',
  Australian: 'au',
  Austrian: 'at',
  Belgian: 'be',
  Brazilian: 'br',
  British: 'gb',
  Canadian: 'ca',
  Chilean: 'cl',
  Chinese: 'cn',
  Colombian: 'co',
  Czech: 'cz',
  Danish: 'dk',
  Dutch: 'nl',
  Finnish: 'fi',
  French: 'fr',
  German: 'de',
  'Hong Kong': 'hk',
  Hungarian: 'hu',
  Indian: 'in',
  Indonesian: 'id',
  Irish: 'ie',
  Italian: 'it',
  Japanese: 'jp',
  Liechtensteiner: 'li',
  Malaysian: 'my',
  Mexican: 'mx',
  Monegasque: 'mc',
  'New Zealander': 'nz',
  Polish: 'pl',
  Portuguese: 'pt',
  Russian: 'ru',
  'South African': 'za',
  Spanish: 'es',
  Swedish: 'se',
  Swiss: 'ch',
  Thai: 'th',
  Uruguayan: 'uy',
  Venezuelan: 've',
};

const COUNTRY: Record<string, string> = {
  Argentina: 'ar',
  Australia: 'au',
  Austria: 'at',
  Azerbaijan: 'az',
  Bahrain: 'bh',
  Belgium: 'be',
  Brazil: 'br',
  Canada: 'ca',
  China: 'cn',
  France: 'fr',
  Germany: 'de',
  Hungary: 'hu',
  India: 'in',
  Italy: 'it',
  Japan: 'jp',
  Korea: 'kr',
  Malaysia: 'my',
  Mexico: 'mx',
  Monaco: 'mc',
  Morocco: 'ma',
  Netherlands: 'nl',
  Portugal: 'pt',
  Qatar: 'qa',
  Russia: 'ru',
  'Saudi Arabia': 'sa',
  Singapore: 'sg',
  'South Africa': 'za',
  Spain: 'es',
  Sweden: 'se',
  Switzerland: 'ch',
  Turkey: 'tr',
  UAE: 'ae',
  UK: 'gb',
  USA: 'us',
};

/** Flag image URL for a nationality ("British") or a country ("UK"); null when unknown. */
export function flagUrl(value: string | null | undefined, kind: 'nationality' | 'country'): string | null {
  if (!value) return null;
  const code = (kind === 'nationality' ? NATIONALITY : COUNTRY)[value];
  return code ? (FLAGS[code] ?? null) : null;
}
