<script>
    import { Tabs } from "@core"
    import {
        LightTheme,
        DarkTheme,
        TronTheme,
    } from "@theme"

    export let theme
    export let vertical

    const themeMap = {
        light: LightTheme,
        dark: DarkTheme,
        tron: TronTheme,
    }
    const themes = [
        { label: "Light", icon: "sun", value: "light" },
        { label: "Dark", icon: "moon", value: "dark" },
        { label: "Tron", icon: "laptop", value: "tron" },
    ]
    let currentTheme = localStorage.theme ?? "light"

    $: theme = themeMap[currentTheme]
    $: localStorage.theme = currentTheme
</script>

<Tabs bind:tabGroup={currentTheme} options={themes} {vertical} />
