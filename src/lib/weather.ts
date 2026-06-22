// Weather via Open-Meteo (no API key). Geocode a city name, then fetch the
// current conditions. All failures throw a WeatherError; callers fall back to
// no-weather behavior so outfit generation always works.

export interface WeatherContext {
  city: string
  temperature: number // °C
  apparentTemperature: number | null // °C
  precipitation: number // mm
  precipitationProbability: number | null // %
  windSpeed: number // km/h
  weatherCode: number // WMO code
  condition: string // human-readable
}

export class WeatherError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WeatherError'
  }
}

// WMO weather interpretation codes → short text.
export function weatherCodeToText(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code >= 85 && code <= 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Unknown'
}

interface GeoResult {
  latitude: number
  longitude: number
  name: string
  admin1?: string
  country_code?: string
}

async function geocode(city: string): Promise<GeoResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city,
  )}&count=1&language=en&format=json`
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new WeatherError('Could not reach the weather service.')
  }
  if (!res.ok) throw new WeatherError('Could not look up that location.')
  const data = await res.json()
  const first: GeoResult | undefined = data?.results?.[0]
  if (!first) throw new WeatherError(`No location found for “${city}”.`)
  return first
}

export async function fetchWeather(city: string): Promise<WeatherContext> {
  const trimmed = city.trim()
  if (!trimmed) throw new WeatherError('Enter a city to get weather.')

  const geo = await geocode(trimmed)

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
    `&daily=precipitation_probability_max&timezone=auto&forecast_days=1`

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new WeatherError('Could not reach the weather service.')
  }
  if (!res.ok) throw new WeatherError('Could not fetch the weather.')

  const data = await res.json()
  const cur = data?.current
  if (!cur || typeof cur.temperature_2m !== 'number') {
    throw new WeatherError('Weather data was unavailable.')
  }

  const label = [geo.name, geo.admin1].filter(Boolean).join(', ')

  return {
    city: label,
    temperature: cur.temperature_2m,
    apparentTemperature: typeof cur.apparent_temperature === 'number' ? cur.apparent_temperature : null,
    precipitation: typeof cur.precipitation === 'number' ? cur.precipitation : 0,
    precipitationProbability:
      typeof data?.daily?.precipitation_probability_max?.[0] === 'number'
        ? data.daily.precipitation_probability_max[0]
        : null,
    windSpeed: typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : 0,
    weatherCode: typeof cur.weather_code === 'number' ? cur.weather_code : 0,
    condition: weatherCodeToText(cur.weather_code ?? 0),
  }
}

// Multi-day forecast for the Weekly Planner. Returns a map of YYYY-MM-DD →
// WeatherContext for the requested date range. Dates outside the forecast
// window are simply absent (callers fall back to no-weather for those days).
export async function fetchForecast(
  city: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, WeatherContext>> {
  const trimmed = city.trim()
  if (!trimmed) throw new WeatherError('Enter a city to get weather.')

  const geo = await geocode(trimmed)
  const label = [geo.name, geo.admin1].filter(Boolean).join(', ')

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,` +
    `precipitation_sum,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=auto&start_date=${startDate}&end_date=${endDate}`

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new WeatherError('Could not reach the weather service.')
  }
  if (!res.ok) throw new WeatherError('Could not fetch the forecast.')

  const data = await res.json()
  const d = data?.daily
  const out: Record<string, WeatherContext> = {}
  if (!d?.time) return out

  for (let i = 0; i < d.time.length; i++) {
    const max = d.temperature_2m_max?.[i]
    const min = d.temperature_2m_min?.[i]
    const mean =
      typeof max === 'number' && typeof min === 'number'
        ? (max + min) / 2
        : typeof max === 'number'
          ? max
          : null
    if (mean === null) continue
    const code = typeof d.weather_code?.[i] === 'number' ? d.weather_code[i] : 0
    out[d.time[i]] = {
      city: label,
      temperature: mean,
      apparentTemperature:
        typeof d.apparent_temperature_max?.[i] === 'number' ? d.apparent_temperature_max[i] : null,
      precipitation: typeof d.precipitation_sum?.[i] === 'number' ? d.precipitation_sum[i] : 0,
      precipitationProbability:
        typeof d.precipitation_probability_max?.[i] === 'number'
          ? d.precipitation_probability_max[i]
          : null,
      windSpeed: typeof d.wind_speed_10m_max?.[i] === 'number' ? d.wind_speed_10m_max[i] : 0,
      weatherCode: code,
      condition: weatherCodeToText(code),
    }
  }
  return out
}

// Compact, English payload for the AI ranker.
export function summarizeWeatherForAI(w: WeatherContext): Record<string, unknown> {
  return {
    temperature_c: Math.round(w.temperature),
    apparent_c: w.apparentTemperature !== null ? Math.round(w.apparentTemperature) : null,
    condition: w.condition,
    precipitation_mm: w.precipitation,
    rain_probability_pct: w.precipitationProbability,
    wind_kmh: Math.round(w.windSpeed),
  }
}

// True when conditions suggest a wet day (drives shoe/outerwear logic).
export function isWet(w: WeatherContext): boolean {
  return (
    w.precipitation > 0.1 ||
    (w.precipitationProbability ?? 0) >= 50 ||
    (w.weatherCode >= 51 && w.weatherCode <= 86) ||
    w.weatherCode >= 95
  )
}

// Effective "feels like" temperature used for layering decisions.
export function feelsLike(w: WeatherContext): number {
  return w.apparentTemperature ?? w.temperature
}
