<script>
    import Flex from "./layout/flex.svelte"
    import vars from "./util/vars"

    export let borderColor = null
    export let card
    export let flat
    export let layout = Flex
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

    content-wrapper {
        display: grid;
        overflow: hidden;
    }
</style>

<doric-paper
use:vars={variables}
class:card
class:flat
class:square
>
    <slot name="title">
        <div />
    </slot>
    <content-wrapper>
        <svelte:component this={layout} {...layoutProps}>
            <slot />
        </svelte:component>
    </content-wrapper>
    <slot name="action">
        <div />
    </slot>
</doric-paper>
