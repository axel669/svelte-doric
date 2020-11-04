<script>
import Ripple from "../ripple.svelte"

export let clickable
export let href = null
export let target = "_blank"
;</script>

<style>
list-item {
    display: grid;
    position: relative;
    overflow: hidden;
    padding: 12px 16px;
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
a {
    position: absolute;
    top: 0px;
    left: 0px;
    bottom: 0px;
    right: 0px;
    opacity: 0;
}
</style>

<list-item on:click class:clickable>
    <slot />
    {#if clickable}
        <Ripple />
    {/if}
    {#if href}
        <a {href} {target}>{href}</a>
    {/if}
</list-item>
