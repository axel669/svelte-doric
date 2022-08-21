<script>
    import vars from "../util/vars"

    export let direction = "column"
    export let padding = "4px"
    export let gap = "4px"
    export let itemFill = false
    export let scrollable = false
    export let wrap = false

    $: flexVars = {
        direction,
        padding,
        gap,
    }
</script>

<style>
    flex-layout {
        display: flex;
        flex-wrap: nowrap;

        flex-direction: var(--direction);
        padding: var(--padding);
        gap: var(--gap);
    }
    flex-layout.item-fill > :global(*) {
        flex-grow: 1;
    }
    .scrollable {
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        height: 100%;
        scroll-behavior: auto;
    }
    .wrap {
        flex-wrap: wrap;
    }

    flex-layout > :global(flex-break),
    flex-layout.item-fill > :global(flex-break) {
        flex-basis: 100%;
        height: 0;
        width: 0;
    }
</style>

<flex-layout
use:vars={flexVars}
class:item-fill={itemFill}
class:scrollable
class:wrap
>
    <slot />
</flex-layout>
