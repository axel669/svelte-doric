<script>
    import vars from "../util/vars"

    export let center = false
    export let contentAlign = null
    export let direction = "column"
    export let gap = "4px"
    export let itemAlign = null
    export let itemFill = false
    export let itemJustify = null
    export let padding = "4px"
    export let scrollable = false
    export let wrap = false

    $: flexVars = {
        direction,
        padding,
        gap,
        "item-align": itemAlign,
        "item-justify": itemJustify,
        "content-align": contentAlign,
    }
</script>

<style>
    flex-layout {
        display: flex;
        flex-wrap: nowrap;

        flex-direction: var(--direction);
        padding: var(--padding);
        gap: var(--gap);

        align-items: var(--item-align);
        justify-content: var(--item-justify);
        align-content: var(--content-align);
    }
    flex-layout.item-fill > :global(*) {
        flex-grow: 1;
    }
    flex-layout.scrollable {
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        height: 100%;
        scroll-behavior: auto;
    }
    flex-layout.wrap {
        flex-wrap: wrap;
    }
    flex-layout.center {
        align-items: center;
        justify-content: center;
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
class:center
>
    <slot />
</flex-layout>
