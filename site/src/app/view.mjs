import { writable, derived } from "svelte/store"

import * as component from "../component/*"

const currentView = writable(
    localStorage.page
    ?? null
)
const view = derived(
    [currentView],
    ([current]) => component[current]
)
const components = Object.keys(component)

export { currentView, view, components }
