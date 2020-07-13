<script>
import Ripple from "../ripple.svelte"

export let clickable
;</script>

<style>
list-item {
    display: grid;
    position: relative;
    padding: 12px 16px;
    background-color: var(--control-background);
    color: var(--text-normal);
    grid-template-areas:
        "start-adornment content end-adornment"
    ;
    grid-template-columns: auto 1fr auto;
}
list-item.clickable {
    cursor: pointer;
    user-select: none;
}

.compact > list-item {
    padding: 4px 8px;
}
</style>

<list-item on:click class:clickable>
    <slot />
    {#if clickable}
        <Ripple />
    {/if}
</list-item>
