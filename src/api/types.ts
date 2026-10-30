// Result of any data request: the payload plus where and when it came from.

export interface DataMeta {
  provider: string;
  sourceUrl: string;
  /** ISO time of the last successful fetch. */
  fetchedAt: string;
  /** True when live fetch failed and saved data is shown instead. */
  stale: boolean;
  staleReason?: string;
}

export interface Fetched<T> {
  data: T;
  meta: DataMeta;
}
