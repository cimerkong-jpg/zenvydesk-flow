export type MarketCode = 'VN' | 'TH' | 'PH' | 'MY'

export const MARKET_OPTIONS: MarketCode[] = ['VN', 'TH', 'PH', 'MY']

export const MARKET_DEFAULT_LANGUAGE: Record<MarketCode, string> = {
  VN: 'vi',
  TH: 'th',
  PH: 'en',
  MY: 'ms',
}

export const MARKET_LABELS: Record<MarketCode, string> = {
  VN: 'Vietnam',
  TH: 'Thailand',
  PH: 'Philippines',
  MY: 'Malaysia',
}
