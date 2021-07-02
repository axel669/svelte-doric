<script>
    import vars from "../util/vars"

    export let direction = "row"
    export let padding = "8px"
    export let gap = "2px"
    export let itemFill = false

    $: flexVars = {
        direction,
        padding,
        gap,
    }
</script>

<style>
    flex-layout {
        display: flex;
        flex-wrap: wrap;

        flex-direction: var(--direction);
        padding: var(--padding);
        gap: var(--gap);
    }
    flex-layout.item-fill > :global(*) {
        flex-grow: 1;
        /* flex-basis: 0; */
    }

    flex-layout > :global(flex-break), flex-layout.item-fill > :global(flex-break) {
        flex-basis: 100%;
        height: 0;
        width: 0;
    }
</style>

<flex-layout use:vars={flexVars} class:item-fill={itemFill} {direction}>
    <slot />
</flex-layout>
