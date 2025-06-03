// services/weatherService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWeather } from './weatherService'; // Adjust path as necessary

// services/weatherService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWeather } from './weatherService';

// Store the original import.meta.env
const originalImportMetaEnv = import.meta.env;

describe('getWeather', () => {
  const mockLatitude = 34.0522;
  const mockLongitude = -118.2437;

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
    // Set a default mock API key for most tests
    vi.stubGlobal('import', { meta: { env: { VITE_OPENWEATHERMAP_API_KEY: 'test_api_key' } } });
  });

  afterEach(() => {
    // Restore original import.meta.env and reset mocks
    vi.stubGlobal('import', { meta: { env: originalImportMetaEnv } } );
    vi.restoreAllMocks();
  });

  it('should return weather data on successful API call', async () => {
    const mockWeatherData = {
      name: 'Los Angeles',
      main: { temp: 25, humidity: 60 },
      weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      wind: { speed: 5 },
      sys: { country: 'US' },
    };

    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeatherData,
    });

    const result = await getWeather(mockLatitude, mockLongitude);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.openweathermap.org/data/2.5/weather?lat=${mockLatitude}&lon=${mockLongitude}&appid=test_api_key&units=metric`
    );
    expect(result).toEqual({
      locationName: 'Los Angeles',
      temperature: 25,
      weatherCondition: 'Clear',
      weatherDescription: 'clear sky',
      humidity: 60,
      windSpeed: 5,
      icon: '01d',
      country: 'US',
    });
  });

  it('should throw an error if API key is missing', async () => {
    vi.stubGlobal('import', { meta: { env: { VITE_OPENWEATHERMAP_API_KEY: undefined } } });

    await expect(getWeather(mockLatitude, mockLongitude)).rejects.toThrow(
      'Missing or placeholder OpenWeatherMap API key.'
    );
  });

  it('should throw an error if API key is the placeholder value', async () => {
    vi.stubGlobal('import', { meta: { env: { VITE_OPENWEATHERMAP_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE' } } });

    await expect(getWeather(mockLatitude, mockLongitude)).rejects.toThrow(
      'Missing or placeholder OpenWeatherMap API key.'
    );
  });

  it('should throw an error on network failure', async () => {
    (fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

    await expect(getWeather(mockLatitude, mockLongitude)).rejects.toThrow('Network error');
  });

  it('should throw an error on API error response (e.g., 401)', async () => {
    (fetch as vi.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(getWeather(mockLatitude, mockLongitude)).rejects.toThrow('API request failed: Unauthorized');
  });

  it('should throw an error on API error response (e.g., 404)', async () => {
    (fetch as vi.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(getWeather(mockLatitude, mockLongitude)).rejects.toThrow('API request failed: Not Found');
  });

  it('should handle unexpected API response structure gracefully (missing weather)', async () => {
    const mockIncompleteWeatherData = {
      name: 'Somewhere',
      main: { temp: 20, humidity: 50 },
      // weather array is missing
      wind: { speed: 3 },
      sys: { country: 'GB' },
    };

    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockIncompleteWeatherData,
    });

    // Depending on implementation, this might throw or return default values
    // Current implementation will throw because weather[0] is undefined
    await expect(getWeather(mockLatitude, mockLongitude)).rejects.toThrow();
  });

  it('should handle unexpected API response structure gracefully (missing main)', async () => {
    const mockIncompleteWeatherData = {
      name: 'Somewhere Else',
      // main object is missing
      weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }],
      wind: { speed: 2 },
      sys: { country: 'FR' },
    };

    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockIncompleteWeatherData,
    });

    // Current implementation will throw because main.temp is undefined
    await expect(getWeather(mockLatitude, mockLongitude)).rejects.toThrow();
  });

  it('should use default N/A values for missing weather details', async () => {
    const mockPartialWeatherData = {
      name: 'Test City',
      main: { temp: 10, humidity: 80 },
      weather: [{}], // Empty weather object
      wind: { speed: 1 },
      sys: { country: 'DE' },
    };

    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPartialWeatherData,
    });

    const result = await getWeather(mockLatitude, mockLongitude);
    expect(result).toEqual({
      locationName: 'Test City',
      temperature: 10,
      weatherCondition: 'N/A',
      weatherDescription: 'N/A',
      humidity: 80,
      windSpeed: 1,
      icon: '',
      country: 'DE',
    });
  });

});
