<script>
    import {
        List,
        Tabs,
        TitleBar,
    } from "@core"

    import { themeValue } from "./theme.mjs"
    import { currentView, components } from "./view.mjs"

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
</script>

<div style="width: 15vw;" />

<TitleBar>
    Theme
</TitleBar>
<Tabs bind:tabGroup={$themeValue} options={themes} vertical />

<TitleBar>
    Components
</TitleBar>
<Tabs bind:tabGroup={$currentView} options={componentList} vertical />
