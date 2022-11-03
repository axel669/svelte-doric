import { writable, derived } from "svelte/store"

import { hash } from "@core"

import Home from "./home.svelte"
import * as component from "../component/*"

// const currentView = writable(
//     localStorage.page
//     ?? null
// )
const view = derived(
    [hash],
    ([current]) => component[current] ?? Home
)
const components = Object.keys(component)

export { view, components }
