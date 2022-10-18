import { writable, derived } from "svelte/store"

import Home from "./home.svelte"
import * as component from "../component/*"

const currentView = writable(
    localStorage.page
    ?? null
)
const view = derived(
    [currentView],
    ([current]) => component[current] ?? Home
)
const components = Object.keys(component)

export { currentView, view, components }
