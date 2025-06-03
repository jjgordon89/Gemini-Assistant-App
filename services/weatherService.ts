
// services/weatherService.ts

// Interface for structured weather data from OpenWeatherMap
interface WeatherData {
  locationName: string; // e.g., "London"
  temperature: number; // Celsius
  weatherCondition: string; // e.g., "Clouds"
  weatherDescription: string; // e.g., "scattered clouds"
  humidity: number; // Percentage
  windSpeed: number; // Meter/sec
  icon: string; // Weather icon ID
  country: string; // Country code e.g. GB
}

// Fetches weather data from OpenWeatherMap API
export const getWeather = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;

  if (!apiKey || apiKey === 'YOUR_ACTUAL_API_KEY_HERE') {
    console.error(
      'WeatherService: Missing or placeholder OpenWeatherMap API key. Please set VITE_OPENWEATHERMAP_API_KEY in your .env.local file.'
    );
    throw new Error('Missing or placeholder OpenWeatherMap API key.');
  }

  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

  console.log(`WeatherService: Fetching weather for lat: ${latitude}, lon: ${longitude}`);

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      // Handle HTTP errors (e.g., 401 Unauthorized, 404 Not Found)
      console.error(`WeatherService: API request failed with status ${response.status}`);
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Map the API response to our WeatherData interface
    // Refer to OpenWeatherMap API documentation for response structure:
    // https://openweathermap.org/current
    const weatherDetails = data.weather && data.weather[0] ? data.weather[0] : {};

    return {
      locationName: data.name,
      temperature: data.main.temp,
      weatherCondition: weatherDetails.main || "N/A",
      weatherDescription: weatherDetails.description || "N/A",
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: weatherDetails.icon || "",
      country: data.sys.country,
    };
  } catch (error) {
    console.error("WeatherService: Error fetching or parsing weather data", error);
    // Re-throw the error or return a default/error state
    // For now, re-throwing to let the caller handle it
    throw error;
  }
};