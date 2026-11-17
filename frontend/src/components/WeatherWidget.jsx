import { useEffect, useState } from 'react';

const CITIES = [
  { name: 'Colombo', lat: 6.9271, lng: 79.8612 }, { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
  { name: 'Galle', lat: 6.0535, lng: 80.221 }, { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
];
const icon = (c) => (c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌧️' : '⛈️');
const risk = (mm) => (mm >= 100 ? ['Severe', 'severe'] : mm >= 50 ? ['High', 'high'] : mm >= 10 ? ['Moderate', 'moderate'] : ['Low', '']);

// Free Open-Meteo forecast (no API key). Shows today's rainfall so flood risk is visible at a glance.
export default function WeatherWidget() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all(CITIES.map((c) =>
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=temperature_2m,wind_speed_10m,weather_code&daily=precipitation_sum&forecast_days=1&timezone=auto`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => ({ ...c, temp: j.current.temperature_2m, wind: j.current.wind_speed_10m, code: j.current.weather_code, rain: j.daily.precipitation_sum[0] ?? 0 }))
    )).then((d) => live && setData(d)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);

  return (
    <div className="panel">
      <h2>Weather and rain indicator</h2><small className="muted">Indicative forecast rainfall only — not an official flood warning.</small>
      {failed && <p className="muted">Weather data is unavailable right now. Check your internet connection.</p>}
      {!data && !failed && <p className="muted">Loading forecast…</p>}
      {data && (
        <div className="wx">
          {data.map((c) => { const [text, cls] = risk(c.rain); return (
            <div className="wx-item" key={c.name}>
              <small>{c.name}</small>
              <span className="big">{icon(c.code)} {Math.round(c.temp)}°C</span>
              <small>{c.rain} mm rain today · wind {Math.round(c.wind)} km/h</small>
              <span className={`risk ${cls}`}>Rainfall indicator: {text}</span>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}
