export interface WeatherData {
  temperature_c: number;
  humidity_pct: number;
  location_name: string;
}

const CITIES = {
  delhi: { lat: 28.6139, lon: 77.2090, name: "New Delhi, India" },
  mumbai: { lat: 19.0760, lon: 72.8777, name: "Mumbai, India" },
  bangalore: { lat: 12.9716, lon: 77.5946, name: "Bangalore, India" },
  london: { lat: 51.5074, lon: -0.1278, name: "London, UK" },
  dubai: { lat: 25.2048, lon: 55.2708, name: "Dubai, UAE" }
};

export type CityKey = keyof typeof CITIES;

export async function fetchLiveWeather(city: CityKey): Promise<WeatherData> {
  const coords = CITIES[city];
  if (!coords) throw new Error("Invalid city");

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API failed");
    
    const data = await res.json();
    return {
      temperature_c: data.current.temperature_2m,
      humidity_pct: data.current.relative_humidity_2m,
      location_name: coords.name
    };
  } catch (err) {
    console.error("Failed to fetch live weather", err);
    throw err;
  }
}
