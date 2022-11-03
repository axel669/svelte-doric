<script>
    import Flex from "./layout/flex.svelte"
    import vars from "./util/vars.js"
    import grid from "./util/grid.mjs"

    export let borderColor = null
    export let card
    export let flat
    export let layout = Flex
    export let overflow = false
    export let square

    const layoutProps = Object.fromEntries(
        Object.entries($$props)
            .filter(
                ([key]) => key.startsWith("l") && key !== "layout"
            )
            .map(
                ([key, value]) => [key.slice(1), value]
            )
    )

    $: variables = {
        "border-color": borderColor,
    }
</script>

<style>
    doric-paper {
        display: grid;
        border-radius: 4px;
        border-style: solid;
        border-width: 0px;
        box-shadow: 0px 2px 4px var(--shadow-color);
        overflow: hidden;
        grid-template-columns: 1fr;
        grid-template-rows: min-content auto min-content;

        background-color: var(--card-background);
        border-color: var(--border-color, var(--layer-border-color));
    }

    doric-paper.card {
        border-width: var(--layer-border-width);
    }

    doric-paper.square {
        border-radius: 0px;
    }

    doric-paper.flat {
        box-shadow: none;
    }
    doric-paper.overflow {
        overflow: visible;
    }
</style>

<doric-paper
use:vars={variables}
use:grid={$$props}
class:card
class:flat
class:square
class:overflow
>
    <slot name="title">
        <div />
    </slot>
    <svelte:component this={layout} {overflow} {...layoutProps}>
        <slot />
    </svelte:component>
    <slot name="action">
        <div />
    </slot>
</doric-paper>
