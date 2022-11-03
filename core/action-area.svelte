<script>
    import grid from "./util/grid.mjs"

    export let disabled
    export let square
</script>

<style>
    action-area {
        --ripple-color: var(--ripple-normal);
        display: grid;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        border-radius: 4px;
    }
    action-area::after {
        position: absolute;
        content: "";
        width: 100%;
        height: 100%;
        transition: background-color 250ms linear;
        background-color: rgba(0, 0, 0, 0);
    }
    action-area:not(.disabled):active::after {
        transition: background-color 100ms linear;
        background-color: var(--ripple-color, var(--ripple-normal));
    }
    .square {
        border-radius: 0px;
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<action-area on:click class:disabled class:square use:grid={$$props}>
    <slot />
</action-area>
