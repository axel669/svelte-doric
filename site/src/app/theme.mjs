import { writable, derived } from "svelte/store"

import { LightTheme, DarkTheme, TronTheme } from "@core"

const themeMap = {
    light: LightTheme,
    dark: DarkTheme,
    tron: TronTheme,
}
const themeValue = writable(
    localStorage.theme ?? "dark"
)
const theme = derived(
    [themeValue],
    ([value]) => themeMap[value]
)

themeValue.subscribe(
    (value) => localStorage.theme = value
)

export { theme, themeValue }
