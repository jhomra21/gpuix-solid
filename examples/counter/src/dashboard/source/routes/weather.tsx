import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { Button, Card, initialWeather, inputStyle, palette, type WeatherLocation } from "../native"

const fixtureNow = Date.parse("2025-06-03T12:00:00.000Z")

function WeatherIcon(props: { name: "location" | "refresh" | "x" | "cloud"; size?: number; color?: string }): SolidElement {
  const size = props.size ?? 16
  const color = props.color ?? palette.secondary
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={{ width: size, height: size, flexShrink: 0, pointerEvents: "none" }}
    >
      <Show when={props.name === "location"}>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </Show>
      <Show when={props.name === "refresh"}>
        <path d="M4 4v5h5" />
        <path d="M20 20v-5h-5" />
        <path d="M19 9a7 7 0 0 0-12-3L4 9" />
        <path d="M5 15a7 7 0 0 0 12 3l3-3" />
      </Show>
      <Show when={props.name === "x"}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </Show>
      <Show when={props.name === "cloud"}>
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </Show>
    </svg>
  )
}

function updatedLabel(lastUpdated: string): string {
  const diff = Math.max(0, fixtureNow - Date.parse(lastUpdated))
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function WeatherCard(props: {
  location: WeatherLocation
  onRefresh(location: WeatherLocation): void
  onDelete(location: WeatherLocation): void
}): SolidElement {
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)

  return (
    <Card style={{ width: 320, padding: 24 }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, flexGrow: 1 }}>
          <text style={{ color: palette.text, fontSize: 17, fontWeight: 600 }}>{props.location.city}</text>
          <Show when={props.location.isCurrentLocation}>
            <div testId={`weather-current-${props.location.id}`} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8, borderRadius: 6, borderWidth: 1, borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}>
              <WeatherIcon name="location" size={12} color="#2563eb" />
              <text style={{ color: "#1d4ed8", fontSize: 10 }}>Current Location</text>
            </div>
          </Show>
        </div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <div testId={`weather-refresh-${props.location.id}`} aria-label="Refresh weather data" onClick={() => props.onRefresh(props.location)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer", hover: { backgroundColor: palette.muted } }}>
            <WeatherIcon name="refresh" />
          </div>
          <Show when={showDeleteConfirm()} fallback={
            <div testId={`weather-delete-${props.location.id}`} aria-label="Delete location" onClick={() => setShowDeleteConfirm(true)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer", hover: { backgroundColor: "#fef2f2" } }}>
              <WeatherIcon name="x" color={palette.secondary} />
            </div>
          }>
            <div testId={`weather-delete-confirmation-${props.location.id}`} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Button testId={`weather-delete-confirm-${props.location.id}`} onClick={() => props.onDelete(props.location)}>
                <text style={{ color: palette.destructive, fontSize: 10 }}>Delete</text>
              </Button>
              <Button testId={`weather-delete-cancel-${props.location.id}`} onClick={() => setShowDeleteConfirm(false)}>
                <text style={{ color: palette.secondary, fontSize: 10 }}>Cancel</text>
              </Button>
            </div>
          </Show>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <text testId={`weather-temperature-${props.location.id}`} style={{ color: palette.text, fontSize: 30, fontWeight: 700 }}>{Math.round(props.location.temperature)}°C</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>{props.location.description}</text>
        </div>
        <WeatherIcon name="cloud" size={48} color="#64748b" />
      </div>

      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
        <div style={{ width: "44%", display: "flex", flexDirection: "column", gap: 2 }}>
          <text style={{ color: palette.secondary, fontSize: 11 }}>Feels like:</text>
          <text testId={`weather-feels-${props.location.id}`} style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>{Math.round(props.location.feelsLike)}°C</text>
        </div>
        <div style={{ width: "44%", display: "flex", flexDirection: "column", gap: 2 }}>
          <text style={{ color: palette.secondary, fontSize: 11 }}>Humidity:</text>
          <text testId={`weather-humidity-${props.location.id}`} style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>{props.location.humidity}%</text>
        </div>
        <div style={{ width: "44%", display: "flex", flexDirection: "column", gap: 2 }}>
          <text style={{ color: palette.secondary, fontSize: 11 }}>Wind:</text>
          <text testId={`weather-wind-${props.location.id}`} style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>{props.location.windSpeed} m/s</text>
        </div>
        <div style={{ width: "44%", display: "flex", flexDirection: "column", gap: 2 }}>
          <text style={{ color: palette.secondary, fontSize: 11 }}>Updated:</text>
          <text testId={`weather-updated-${props.location.id}`} style={{ color: palette.text, fontSize: 12, fontWeight: 500 }}>{updatedLabel(props.location.lastUpdated)}</text>
        </div>
      </div>
    </Card>
  )
}

export function WeatherRoute(): SolidElement {
  const [locations, setLocations] = createSignal<WeatherLocation[]>(initialWeather)
  const [city, setCity] = createSignal("")
  const [formError, setFormError] = createSignal<string | null>(null)
  const [showGeolocationPrompt, setShowGeolocationPrompt] = createSignal(true)
  const [refreshCount, setRefreshCount] = createSignal(0)

  const hasCurrentLocation = createMemo(() => locations().some((location) => location.isCurrentLocation))

  const addLocation = (): void => {
    const nextCity = city().trim()
    if (!nextCity) {
      setFormError("Please enter a location name")
      return
    }
    const id = locations().reduce((max, location) => Math.max(max, location.id), 0) + 1
    setLocations((current) => [...current, {
      id,
      city: nextCity,
      isCurrentLocation: false,
      temperature: 22,
      feelsLike: 22,
      humidity: 55,
      windSpeed: 3.2,
      condition: "Clear",
      description: "clear sky",
      lastUpdated: "2025-06-03T12:00:00.000Z",
    }])
    setCity("")
    setFormError(null)
  }

  const addCurrentLocation = (): void => {
    if (!hasCurrentLocation()) {
      setLocations((current) => [{
        id: 0,
        city: "Current Location",
        isCurrentLocation: true,
        temperature: 29,
        feelsLike: 31,
        humidity: 60,
        windSpeed: 3.8,
        condition: "Clear",
        description: "clear sky",
        lastUpdated: "2025-06-03T12:00:00.000Z",
      }, ...current])
    }
    setShowGeolocationPrompt(false)
  }

  const refreshLocation = (location: WeatherLocation): void => {
    setRefreshCount((count) => count + 1)
    setLocations((current) => current.map((item) => item.id === location.id ? {
      ...item,
      lastUpdated: "2025-06-03T12:00:00.000Z",
    } : item))
  }

  const deleteLocation = (location: WeatherLocation): void => {
    setLocations((current) => current.filter((item) => item.id !== location.id))
  }

  return (
    <div testId="page-weather" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <text style={{ color: palette.text, fontSize: 28, fontWeight: 700 }}>Weather Dashboard</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Monitor weather conditions for your favorite locations</text>
        </div>
      </div>

      <Show when={showGeolocationPrompt() && !hasCurrentLocation()}>
        <div testId="weather-geolocation-prompt" style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, backgroundColor: "#eff6ff" }}>
          <div style={{ paddingTop: 2 }}><WeatherIcon name="location" size={20} color="#2563eb" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexGrow: 1 }}>
            <text style={{ color: "#1e3a8a", fontSize: 13, fontWeight: 500 }}>Add your current location?</text>
            <text style={{ color: "#1d4ed8", fontSize: 12 }}>We can automatically detect your location to show local weather conditions.</text>
            <div style={{ display: "flex", flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Button testId="weather-use-location" active onClick={addCurrentLocation}><text style={{ color: palette.white, fontSize: 12 }}>Allow Location</text></Button>
              <Button testId="weather-dismiss-location" onClick={() => setShowGeolocationPrompt(false)}><text style={{ color: "#2563eb", fontSize: 12 }}>Not now</text></Button>
            </div>
          </div>
          <div testId="weather-dismiss-location-x" aria-label="Dismiss geolocation prompt" onClick={() => setShowGeolocationPrompt(false)} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <WeatherIcon name="x" size={16} color="#60a5fa" />
          </div>
        </div>
      </Show>

      <Card style={{ padding: 24 }}>
        <text style={{ color: palette.text, fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Add New Location</text>
        <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 4 }}>
            <input
              testId="weather-city"
              value={city()}
              placeholder="Enter city name (e.g., New York, NY)"
              onChange={(event: EventPayload) => { setCity(event.value ?? ""); if (formError()) setFormError(null) }}
              onSubmit={addLocation}
              style={inputStyle({ width: "100%" })}
            />
            <Show when={formError()}>{(error) => <text testId="weather-form-error" style={{ color: palette.destructive, fontSize: 11 }}>{error()}</text>}</Show>
          </div>
          <Button testId="weather-add" active={Boolean(city().trim())} onClick={addLocation}><text style={{ color: city().trim() ? palette.white : palette.text, fontSize: 12 }}>Add Location</text></Button>
        </div>
        <text style={{ color: palette.secondary, fontSize: 11 }}>Enter a city name to add it to your weather dashboard. Examples: "London", "New York, NY", "Tokyo, Japan"</text>
      </Card>

      <Show when={locations().length > 0} fallback={
        <div testId="weather-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 48, paddingBottom: 48, gap: 8 }}>
          <WeatherIcon name="cloud" size={64} color={palette.secondary} />
          <text style={{ color: palette.text, fontSize: 17, fontWeight: 600 }}>No weather locations yet</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Add your first location above to start monitoring weather conditions</text>
        </div>
      }>
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <For each={locations()}>
            {(location) => <WeatherCard location={location} onRefresh={refreshLocation} onDelete={deleteLocation} />}
          </For>
        </div>
      </Show>
      <text testId="weather-refresh-count" style={{ color: palette.secondary, fontSize: 10, opacity: 0 }}>{refreshCount()} refreshes</text>
    </div>
  )
}