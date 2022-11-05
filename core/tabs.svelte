<script>
    import { onMount } from "svelte"

    import ActionArea from "./action-area.svelte"
    import Icon from "./icon.svelte"

    import vars from "./util/vars"
    import grid from "./util/grid.mjs"

    export let fillSelected = false
    export let iconTop = false
    export let options
    export let scrollable = false
    export let scrollToSelected = false
    export let tabGroup
    export let vertical

    const change = (value) =>
        () => tabGroup = value

    $: tabCount = {
        tabs: options.length
    }

    let tabParent = null
    onMount(() => {
        if (scrollToSelected === false) {
            return
        }
        const item = tabParent.querySelector(".selected")
        const direction = vertical ? "Top" : "Left"

        tabParent[`scroll${direction}`] = item[`offset${direction}`]
    })
</script>

<style>
    doric-tabs {
        position: relative;
        display: grid;
        grid-template-columns: repeat(var(--tabs), 1fr);
        background-color: var(--card-background);
        color: var(--text-normal);
        overflow: hidden;
    }
    doric-tabs.vertical {
        grid-template-columns: 1fr;
        grid-template-rows: repeat(var(--tabs), 1fr);
    }
    doric-tabs.scrollable {
        overflow: auto;
    }

    tab-item {
        display: grid;
        border-width: 0px;
        border-bottom-width: 2px;
        border-style: solid;
        border-color: transparent;
        user-select: none;
    }
    tab-item.selected {
        color: var(--primary);
        border-color: var(--primary);
    }
    .fill-selected tab-item.selected {
        color: var(--text-invert);
        background-color: var(--primary);
    }
    .vertical tab-item {
        border-bottom-width: 0px;
        border-right-width: 2px;
    }
    tab-label {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 12px;
        font-size: var(--text-sixe-header);
    }
    tab-label.vertical {
        flex-direction: column;
    }
</style>

<doric-tabs
class:vertical
class:scrollable
class:fill-selected={fillSelected}
use:vars={tabCount}
use:grid={$$props}
bind:this={tabParent}
>
    {#each options as option (option.value)}
        <tab-item class:selected={option.value === tabGroup}>
            <ActionArea on:click={change(option.value)}>
                <tab-label class:vertical={iconTop}>
                    {#if option.icon}
                        <Icon name={option.icon} />
                    {/if}
                    <span>
                        {option.label}
                    </span>
                </tab-label>
            </ActionArea>
        </tab-item>
    {/each}
</doric-tabs>
