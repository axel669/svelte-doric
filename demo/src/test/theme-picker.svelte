<script context="module">
    import { writable, derived } from "svelte/store"

    import {
        LightTheme,
        DarkTheme,
        TronTheme,
    } from "@core"

    const currentTheme = writable(localStorage.theme ?? "light")
    const themeMap = {
        light: LightTheme,
        dark: DarkTheme,
        tron: TronTheme,
    }

    const theme = derived(
        currentTheme,
        (current) => themeMap[current]
    )

    currentTheme.subscribe(
        themeName => localStorage.theme = themeName
    )

    export {
        currentTheme,
        theme
    }
</script>

<script>
    import { Tabs } from "@core"

    export let vertical

    const themes = [
        { label: "Light", icon: "sun", value: "light" },
        { label: "Dark", icon: "moon", value: "dark" },
        { label: "Tron", icon: "laptop", value: "tron" },
    ]
</script>

<Tabs bind:tabGroup={$currentTheme} options={themes} {vertical} />
