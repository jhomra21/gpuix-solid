import { For, Show, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { Button, Card, initialWeather, inputStyle, palette, type WeatherLocation } from "../native"

export function WeatherRoute(): SolidElement {
  const [locations, setLocations] = createSignal<WeatherLocation[]>(initialWeather)
  const [city, setCity] = createSignal("")
  const [showGeolocationPrompt, setShowGeolocationPrompt] = createSignal(true)
  const [refreshCount, setRefreshCount] = createSignal(0)

  const addLocation = (): void => {
    const nextCity = city().trim()
    if (!nextCity) return
    const id = locations().reduce((max, location) => Math.max(max, location.id), 0) + 1
    setLocations((current) => [...current, { id, city: nextCity, condition: "Clear", temperature: 72 }])
    setCity("")
  }

  return (
    <div testId="page-weather" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <text style={{ color: palette.text, fontSize: 28, fontWeight: 700 }}>Weather Dashboard</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Monitor weather conditions for your favorite locations</text>
        </div>
      </div>

      <Show when={showGeolocationPrompt()}>
        <Card style={{ backgroundColor: palette.sidebar }}>
          <text style={{ color: palette.text, fontSize: 14, fontWeight: 600 }}>Use your current location?</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Add your current location to the weather dashboard.</text>
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <Button testId="weather-use-location" active onClick={() => { setShowGeolocationPrompt(false); if (!locations().some((location) => location.city === "Current Location")) setLocations((current) => [{ id: 0, city: "Current Location", condition: "Clear", temperature: 72 }, ...current]) }}><text style={{ color: palette.white, fontSize: 12 }}>Use Current Location</text></Button>
            <Button testId="weather-dismiss-location" onClick={() => setShowGeolocationPrompt(false)}><text style={{ color: palette.text, fontSize: 12 }}>Not Now</text></Button>
          </div>
        </Card>
      </Show>

      <Card>
        <text style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>Add Location</text>
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <input testId="weather-city" value={city()} placeholder="City" onChange={(event: EventPayload) => setCity(event.value ?? "")} onSubmit={addLocation} style={inputStyle({ flexGrow: 1 })} />
          <Button testId="weather-add" active={Boolean(city().trim())} onClick={addLocation}><text style={{ color: city().trim() ? palette.white : palette.text, fontSize: 12 }}>Add Location</text></Button>
        </div>
      </Card>

      <Show when={locations().length > 0} fallback={
        <div style={{ alignItems: "center", padding: 40, gap: 6 }}>
          <text style={{ color: palette.text, fontSize: 16, fontWeight: 600 }}>No weather locations yet</text>
          <text style={{ color: palette.secondary, fontSize: 12 }}>Add your first location above to start monitoring weather conditions</text>
        </div>
      }>
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <For each={locations()}>
            {(location) => (
              <Card style={{ width: 250 }}>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                  <text style={{ color: palette.text, fontSize: 16, fontWeight: 600 }}>{location.city}</text>
                  <text style={{ color: palette.text, fontSize: 22, fontWeight: 600 }}>{location.temperature}°</text>
                </div>
                <text style={{ color: palette.secondary, fontSize: 12 }}>{location.condition}</text>
                <div style={{ display: "flex", flexDirection: "row", gap: 6 }}>
                  <Button testId={`weather-refresh-${location.id}`} onClick={() => setRefreshCount((count) => count + 1)}><text style={{ color: palette.text, fontSize: 11 }}>Refresh</text></Button>
                  <Button testId={`weather-delete-${location.id}`} onClick={() => setLocations((current) => current.filter((item) => item.id !== location.id))}><text style={{ color: palette.destructive, fontSize: 11 }}>Delete</text></Button>
                </div>
              </Card>
            )}
          </For>
        </div>
      </Show>
      <text testId="weather-refresh-count" style={{ color: palette.secondary, fontSize: 10 }}>{refreshCount()} refreshes</text>
    </div>
  )
}
