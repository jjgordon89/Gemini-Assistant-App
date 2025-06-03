
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

// Fetches weather data.
// Temporarily modified to accept a location string and return mock data for function calling development.
export const getWeather = async (location: string): Promise<WeatherData> => {
  console.log(`WeatherService: Fetching mock weather for location: "${location}"`);

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (location.toLowerCase().includes("london")) {
    return {
      locationName: "London, UK (Mock)",
      temperature: 15,
      weatherCondition: "Clouds",
      weatherDescription: "cloudy with a chance of rain",
      humidity: 75,
      windSpeed: 10, // m/s
      icon: "04d",
      country: "GB",
    };
  } else if (location.toLowerCase().includes("paris")) {
    return {
      locationName: "Paris, FR (Mock)",
      temperature: 18,
      weatherCondition: "Clear",
      weatherDescription: "clear sky",
      humidity: 60,
      windSpeed: 5,
      icon: "01d",
      country: "FR",
    };
  } else if (location.toLowerCase().includes("tokyo")) {
    return {
      locationName: "Tokyo, JP (Mock)",
      temperature: 22,
      weatherCondition: "Rain",
      weatherDescription: "light rain",
      humidity: 85,
      windSpeed: 3,
      icon: "10d",
      country: "JP",
    };
  } else {
    // Default mock response
    return {
      locationName: `${location} (Mock)`,
      temperature: 20,
      weatherCondition: "Sunny",
      weatherDescription: "pleasant weather",
      humidity: 50,
      windSpeed: 2,
      icon: "01d",
      country: "N/A",
    };
  }
  // Original OpenWeatherMap API call logic is bypassed for now.
  // const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
  // ... (rest of the original code)
};