<script>
    import {
        Tabs,
        TitleBar,
    } from "@core"

    import { themeValue } from "./theme.mjs"
    import { currentView, components } from "./view.mjs"

    export let close

    const themes = [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
        { label: "Tron", value: "tron" },
    ]
    const componentList = [
        { label: "Home", value: null },
        ...components.map(
            (name) => ({
                value: name,
                label: `${name.charAt(0).toUpperCase()}${name.slice(1)}`
            })
        )
    ]

    const t = $themeValue
    const c = $currentView
    $: if (t !== $themeValue || c !== $currentView) {
        close()
    }
</script>

<div style="width: 12.5vw;" />

<TitleBar>
    Theme
</TitleBar>
<Tabs bind:tabGroup={$themeValue} options={themes} vertical fillSelected />

<TitleBar>
    Components
</TitleBar>
<Tabs bind:tabGroup={$currentView} options={componentList} vertical fillSelected />
