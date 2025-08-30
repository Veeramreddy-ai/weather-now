import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Wind,
  Droplets,
  Sun,
  Moon,
  Thermometer,
  Compass,
  Loader2,
} from "lucide-react";

// --- Small helpers ---------------------------------------------------------
const WMO = {
  0: { label: "Clear sky", icon: ">=6 && isDay ? '☀️' : '🌙'" },
  1: { label: "Mainly clear", icon: ">=6 && isDay ? '🌤️' : '🌤️'" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Freezing drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Rain showers", icon: "🌧️" },
  82: { label: "Violent rain showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Snow showers", icon: "🌨️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm w/ hail", icon: "⛈️" },
  99: { label: "Thunderstorm w/ heavy hail", icon: "⛈️" },
};

function degToCompass(num) {
  const val = Math.floor(num / 22.5 + 0.5);
  const arr = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return arr[val % 16];
}

function formatPlace(p) {
  const parts = [p.name, p.admin1, p.country].filter(Boolean);
  return parts.join(", ");
}

// --- Main App --------------------------------------------------------------
export default function WeatherNowApp() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selected, setSelected] = useState(null); // {name, country, admin1, latitude, longitude}
  const [unit, setUnit] = useState(
    () => localStorage.getItem("wn:unit") || "c"
  ); // 'c' or 'f'
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  // Load last location from storage
  useEffect(() => {
    const raw = localStorage.getItem("wn:last");
    if (raw) {
      try {
        const place = JSON.parse(raw);
        setSelected(place);
      } catch {}
    }
  }, []);

  // Persist unit
  useEffect(() => {
    localStorage.setItem("wn:unit", unit);
  }, [unit]);

  // Fetch weather when selected or unit changes
  useEffect(() => {
    async function go() {
      if (!selected) return;
      setError("");
      setLoadingWeather(true);
      try {
        const uTemp = unit === "f" ? "fahrenheit" : "celsius";
        const uWind = unit === "f" ? "mph" : "kmh";
        const params = new URLSearchParams({
          latitude: selected.latitude,
          longitude: selected.longitude,
          timezone: "auto",
          current: [
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "is_day",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
          ].join(","),
          hourly: ["temperature_2m", "precipitation_probability"].join(","),
          daily: ["sunrise", "sunset"].join(","),
          temperature_unit: uTemp,
          wind_speed_unit: uWind,
        });
        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("Weather fetch failed");
        const data = await r.json();
        setWeather(data);
        localStorage.setItem("wn:last", JSON.stringify(selected));
      } catch (e) {
        console.error(e);
        setError("Couldn't load weather. Try again.");
      } finally {
        setLoadingWeather(false);
      }
    }
    go();
  }, [selected, unit]);

  // Debounced search
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const params = new URLSearchParams({
          name: query,
          count: "8",
          format: "json",
          language: "en",
        });
        const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error("Search failed");
        const data = await r.json();
        setResults(data.results || []);
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setLoadingSearch(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(id);
    };
  }, [query]);

  const current = weather?.current;
  const isDay = current?.is_day === 1;
  const code = current?.weather_code ?? 0;
  const codeInfo = WMO[code] || { label: "Unknown", icon: "❓" };

  // --- UI ------------------------------------------------------------------
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-100 via-white to-white text-slate-900 flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Weather Now
          </h1>
          <UnitToggle unit={unit} setUnit={setUnit} />
        </header>

        <div className="relative">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-3 shadow-sm focus-within:ring-2 ring-sky-300">
            <Search className="w-5 h-5 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) {
                  setSelected(results[0]);
                  setQuery(formatPlace(results[0]));
                  setResults([]);
                }
              }}
              placeholder="Enter a city (e.g., Denver, Paris, Tokyo)"
              className="w-full outline-none bg-transparent placeholder:text-slate-400"
              aria-label="City search"
            />
            {loadingSearch && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          {results.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-10 mt-2 w-full max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              {results.map((r) => (
                <li key={`${r.id}`}>
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2"
                    onClick={() => {
                      setSelected(r);
                      setQuery(formatPlace(r));
                      setResults([]);
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{formatPlace(r)}</span>
                    <span className="ml-auto text-slate-500 text-sm">
                      {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <main className="mt-6">
          {!selected && (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-slate-700">
                Search any city to see current conditions. No sign‑ups, just
                fast weather for outdoor plans. 🌤️
              </p>
            </div>
          )}

          {selected && (
            <div className="rounded-2xl border bg-white/80 backdrop-blur p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm uppercase tracking-wide text-slate-500">
                    Now in
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
                    {formatPlace(selected)}
                  </div>
                </div>
                {loadingWeather && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating…
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 text-sm text-red-600">{error}</div>
              )}

              {current && !error && (
                <section className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="col-span-1 sm:col-span-2 rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-4">
                    <div className="text-5xl" aria-hidden>
                      {codeInfo.icon || (isDay ? "☀️" : "🌙")}
                    </div>
                    <div>
                      <div className="text-5xl font-bold leading-none">
                        {Math.round(current.temperature_2m)}°
                        {unit === "f" ? "F" : "C"}
                      </div>
                      <div className="text-slate-600">
                        {WMO[code]?.label || "—"}
                      </div>
                      <div className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                        {isDay ? (
                          <Sun className="w-4 h-4" />
                        ) : (
                          <Moon className="w-4 h-4" />
                        )}{" "}
                        {isDay ? "Daytime" : "Night"}
                      </div>
                    </div>
                  </div>

                  <StatCard
                    icon={<Thermometer className="w-4 h-4" />}
                    label="Feels like"
                    value={`${Math.round(current.apparent_temperature)}°${
                      unit === "f" ? "F" : "C"
                    }`}
                  />
                  <StatCard
                    icon={<Droplets className="w-4 h-4" />}
                    label="Humidity"
                    value={`${current.relative_humidity_2m}%`}
                  />
                  <StatCard
                    icon={<Wind className="w-4 h-4" />}
                    label="Wind"
                    value={`${Math.round(current.wind_speed_10m)} ${
                      unit === "f" ? "mph" : "km/h"
                    }`}
                    sub={`${degToCompass(
                      current.wind_direction_10m
                    )} • ${Math.round(current.wind_direction_10m)}°`}
                  />

                  <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    <MiniStat
                      label="Precip"
                      value={`${current.precipitation?.toFixed?.(1) ?? 0} ${
                        unit === "f" ? "in" : "mm"
                      }`}
                    />
                    <MiniStat
                      label="Sunrise"
                      value={fmtLocalTime(weather?.daily?.sunrise?.[0])}
                    />
                    <MiniStat
                      label="Sunset"
                      value={fmtLocalTime(weather?.daily?.sunset?.[0])}
                    />
                    <MiniStat
                      label="Updated"
                      value={fmtLocalTime(
                        weather?.current_units?.time
                          ? weather.current.time
                          : new Date().toISOString()
                      )}
                    />
                  </div>
                </section>
              )}
            </div>
          )}

          <footer className="mt-8 text-center text-xs text-slate-500">
            Data by Open‑Meteo • Built for Jamie, the Outdoor Enthusiast
          </footer>
        </main>
      </div>
    </div>
  );
}

function fmtLocalTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function UnitToggle({ unit, setUnit }) {
  return (
    <div className="inline-flex rounded-2xl border bg-white p-1 shadow-sm">
      <button
        className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
          unit === "c"
            ? "bg-sky-600 text-white"
            : "text-slate-700 hover:bg-slate-50"
        }`}
        onClick={() => setUnit("c")}
        aria-pressed={unit === "c"}
      >
        °C
      </button>
      <button
        className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
          unit === "f"
            ? "bg-sky-600 text-white"
            : "text-slate-700 hover:bg-slate-50"
        }`}
        onClick={() => setUnit("f")}
        aria-pressed={unit === "f"}
      >
        °F
      </button>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-slate-500 text-sm mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
