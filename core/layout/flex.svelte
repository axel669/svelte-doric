<script>
    import vars from "../util/vars.js"
    import grid from "../util/grid.mjs"

    export let adorn
    export let center = false
    export let contentAlign = "initial"
    export let direction = "column"
    export let fit
    export let gap = "4px"
    export let itemAlign = "initial"
    export let itemFill = false
    export let itemJustify = "initial"
    export let overflow = false
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
        overflow: hidden;

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
    flex-layout.overflow {
        overflow: visible;
    }
    .fit {
        max-height: 100%;
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
use:grid={$$props}
class:item-fill={itemFill}
class:scrollable
class:wrap
class:center
class:overflow
class:fit
class:ignore-appbar-reskin={adorn === "no-reskin"}
>
    <slot />
</flex-layout>
