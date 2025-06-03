
// Placeholder Weather Service
// In a real application, this would call a weather API.

interface WeatherData {
    location: string;
    temperature: string;
    description: string;
    humidity?: string;
    wind?: string;
  }
  
  export const getWeather = async (location: string): Promise<WeatherData> => {
    console.log(`WeatherService: Fetching weather for ${location}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 700));
  
    // Mock response based on location
    if (location.toLowerCase().includes("london")) {
      return {
        location: "London, UK",
        temperature: "15°C",
        description: "Cloudy with a chance of rain",
        humidity: "75%",
        wind: "10 km/h West"
      };
    } else if (location.toLowerCase().includes("san francisco")) {
      return {
        location: "San Francisco, CA",
        temperature: "18°C",
        description: "Partly cloudy and cool",
        humidity: "60%",
        wind: "15 km/h North-West"
      };
    } else if (location.toLowerCase().includes("tokyo")) {
        return {
            location: "Tokyo, Japan",
            temperature: "22°C",
            description: "Sunny",
            humidity: "50%",
            wind: "5 km/h East"
        };
    }
  
    return {
      location: location,
      temperature: "20°C",
      description: "Pleasant weather",
    };
  };
  