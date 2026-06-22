import { useCallback, useEffect, useState } from 'react'
import { fetchWeather, WeatherError, type WeatherContext } from '@/lib/weather'

const CITY_KEY = 'styleai_weather_city'

export function useWeather() {
  const [city, setCity] = useState<string>(() => localStorage.getItem(CITY_KEY) ?? '')
  const [weather, setWeather] = useState<WeatherContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Loads weather for a city (defaults to the saved city) and persists it.
  const loadWeather = useCallback(async (cityArg?: string): Promise<void> => {
    const target = (cityArg ?? city).trim()
    if (!target) {
      setError('Enter a city to get weather.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const w = await fetchWeather(target)
      setWeather(w)
      setCity(target)
      localStorage.setItem(CITY_KEY, target)
    } catch (err) {
      setWeather(null)
      setError(err instanceof WeatherError ? err.message : 'Could not load weather.')
    } finally {
      setIsLoading(false)
    }
  }, [city])

  // Auto-load on mount if a city was previously saved.
  useEffect(() => {
    const saved = localStorage.getItem(CITY_KEY)
    if (saved) void loadWeather(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { city, setCity, weather, isLoading, error, loadWeather }
}
