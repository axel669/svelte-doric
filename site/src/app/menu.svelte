<script>
    import {
        Button,
        Grid,
        Tabs,
        TitleBar,

        hash,
        onChange,
    } from "@core"

    import { onMount } from "svelte"

    import { themeValue } from "./theme.mjs"
    import { components } from "./view.mjs"

    export let close

    const themes = [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
        { label: "Tron", value: "tron" },
    ]
    const componentList = [
        // { label: "Home", value: null },
        ...components.map(
            (name) => ({
                value: name,
                label: `${name.charAt(0).toUpperCase()}${name.slice(1)}`
            })
        )
    ]

    const themeChanged = onChange($themeValue)
    const pageChanged = onChange($hash)

    let comps = null
    onMount(() => {
        const item = comps.querySelector(".primary")

        if (item === null) {
            return
        }
        comps.scrollTop = item.offsetTop
    })

    $: if (themeChanged($themeValue) === true) {
        close()
    }
    $: if (pageChanged($hash) === true) {
        close()
    }
</script>

<style>
    component-list {
        position: relative;
        display: grid;
        overflow: auto;
        gap: 2px;
        padding: 2px;
        grid-template-columns: 1fr;
        grid-auto-rows: max-content;
    }
</style>

<div style="width: 12.5vw;" />

<Grid cols="1fr" rows="repeat(3, max-content) 3fr" fit>
    <TitleBar>
        Theme
    </TitleBar>
    <Tabs bind:tabGroup={$themeValue} options={themes} vertical fillSelected />

    <TitleBar>
        Components
    </TitleBar>
    <component-list bind:this={comps}>
        <Button link="">
            Home
        </Button>
        {#each componentList as {label, value}}
            {#if value === $hash}
                <Button link={`#${value}`} variant="fill" color="primary">
                    {label}
                </Button>
            {:else}
                <Button link={`#${value}`}>
                    {label}
                </Button>
            {/if}
        {/each}
    </component-list>
</Grid>
