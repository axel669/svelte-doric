<script>
    import {
        Button,
        Icon,
        List,
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

    let a = null
    const viewGithub = () => a.click()

    const t = $themeValue
    const c = $currentView
    $: if (t !== $themeValue || c !== $currentView) {
        close()
    }
</script>

<style>
    a {
        display: none;
    }
</style>

<div style="width: 12.5vw;" />
<a href="https://github.com/axel669/svelte-doric" target="_blank" bind:this={a}>
    Github
</a>

<Button on:tap={viewGithub}>
    <Icon name="brands:github" />
    &nbsp;
    View on Github
</Button>

<TitleBar>
    Theme
</TitleBar>
<Tabs bind:tabGroup={$themeValue} options={themes} vertical fillSelected />

<TitleBar>
    Components
</TitleBar>
<Tabs bind:tabGroup={$currentView} options={componentList} vertical fillSelected />
