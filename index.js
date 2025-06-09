// index.js

// Default coords (Warszawa) na wypadek braku geolokalizacji
const DEFAULT_LAT = 52.2297;
const DEFAULT_LON = 21.0122;

// Pobieramy lokalizację, a potem dane
function init() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                fetchWeatherData(pos.coords.latitude, pos.coords.longitude);
            },
            err => {
                console.warn("Nie udało się pobrać lokalizacji, używam Warszawy", err);
                fetchWeatherData(DEFAULT_LAT, DEFAULT_LON);
            }
        );
    } else {
        console.warn("Geolokalizacja nie wspierana, używam Warszawy");
        fetchWeatherData(DEFAULT_LAT, DEFAULT_LON);
    }
}

async function fetchWeatherData(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&hourly=temperature_2m,weathercode,precipitation,uv_index,relativehumidity_2m,pressure_msl,dewpoint_2m,cloudcover` +
            `&current_weather=true&timezone=auto`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} – ${res.statusText}`);
        }

        const data = await res.json();
        updateCurrentWeather(data);
        displayHourlyForecast(data);
        displayUVIndex(data);
    } catch (e) {
        console.error("Błąd fetchWeatherData:", e);
    }
}

function updateCurrentWeather(data) {
    const { current_weather: current, hourly } = data;
    const now = new Date();

    // Current
    document.getElementById("current-temperature").textContent = `${current.temperature.toFixed(0)}°C`;
    document.getElementById("current-wind-speed").textContent = `${current.windspeed.toFixed(0)} km/h`;
    document.getElementById("current-wind-direction").textContent = `(${windDirectionToText(current.winddirection)})`;
    document.getElementById("weather-description").textContent = weatherCodeToDescription(current.weathercode);
    document.getElementById("weather-timestamp").textContent =
        `Ostatnia aktualizacja: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setWeatherBackground(current.weathercode);

    // Szukamy nextHourIndex
    const nextHourIndex = hourly.time.findIndex(t => new Date(t) > now);
    const humEl = document.getElementById("humidity");
    const presEl = document.getElementById("pressure");
    const dewEl = document.getElementById("dew-point");
    const cloudEl = document.getElementById("cloud-cover");

    if (nextHourIndex !== -1) {
        humEl.textContent = `${hourly.relativehumidity_2m[nextHourIndex].toFixed(0)}%`;
        presEl.textContent = `${hourly.pressure_msl[nextHourIndex].toFixed(0)} hPa`;
        dewEl.textContent = `${hourly.dewpoint_2m[nextHourIndex].toFixed(1)}°C`;
        cloudEl.textContent = `${hourly.cloudcover[nextHourIndex].toFixed(0)}%`;
    } else {
        [humEl, presEl, dewEl, cloudEl].forEach(el => el.textContent = "--");
    }
}

function displayHourlyForecast(data) {
    const now = new Date();
    const { time, temperature_2m, weathercode, precipitation } = data.hourly;
    const hourlyContainer = document.getElementById("hourly-forecast-scroll");
    hourlyContainer.innerHTML = "";

    time.forEach((t, i) => {
        const dt = new Date(t);
        if (dt > now && dt - now <= 24 * 3600 * 1000) {
            const box = document.createElement("div");
            box.className = "hour-box";

            const hour = dt.getHours().toString().padStart(2, '0') + ":00";
            const rain = precipitation[i] > 0 ? `${precipitation[i].toFixed(1)} mm` : "--";
            const icon = precipitation[i] > 0 ? "🌧️" : weatherIcon(weathercode[i]);

            box.innerHTML = `
        <div>${hour}</div>
        <div>${icon}</div>
        <div class="temp">${temperature_2m[i].toFixed(0)}°</div>
        <div>${rain}</div>
      `;
            hourlyContainer.appendChild(box);
        }
    });
}

function displayUVIndex(data) {
    const now = new Date();
    const { time, uv_index } = data.hourly;
    const idx = time.findIndex(t => new Date(t) > now);
    const el = document.getElementById("uv-index");
    el.textContent = idx !== -1 ? uv_index[idx].toFixed(1) : "--";
}

function windDirectionToText(deg) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
}

function weatherCodeToDescription(code) {
    const map = {
        0: "Bezchmurnie", 1: "Częściowo pochmurno", 2: "Pochmurno",
        3: "Zachmurzenie duże", 45: "Mgła", 48: "Osadzająca się mgła",
        51: "Mżawka lekka", 53: "Mżawka", 55: "Mżawka intensywna",
        61: "Deszcz lekki", 63: "Deszcz", 65: "Deszcz intensywny",
        80: "Przelotne opady", 95: "Burza", 99: "Burza z gradem"
    };
    return map[code] || "Nieznana pogoda";
}

function weatherIcon(code) {
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "☁️";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 65) return "🌧️";
    if (code >= 95) return "🌩️";
    return "❓";
}

function setWeatherBackground(code) {
    const container = document.getElementById("app-container");
    let img = "default";

    if (code === 0) img = "sunny";
    else if ([1, 2].includes(code)) img = "partly-cloudy";
    else if (code >= 3 && code < 50) img = "cloudy";
    else if (code >= 51 && code <= 65) img = "rain";
    else if (code >= 95) img = "storm";

    const ext = (img === "partly-cloudy" || img === "mostly-sunny") ? "webp" : "jpg";
    container.style.backgroundImage = `url('./IMGs/DynamicBG/V1/${img}.${ext}')`;
}

// Startujemy
init();
