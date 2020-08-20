<script context="module">
import {tabContext} from "../tabs.svelte"
;</script>

<script>
import {getContext} from "svelte"

import Ripple from "../ripple.svelte"

export let value

const currentTab = getContext(tabContext)
const changeTab = () => currentTab.set(value)
;</script>

<style>
tab-label {
    position: relative;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    border-bottom: 2px solid transparent;
    flex-grow: 1;
    flex-basis: 0;
}
tab-label.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}

:global(.vertical) tab-label {
    border-bottom: 1px solid var(--text-secondary);
    border-right: 4px solid transparent;
}
:global(.vertical) tab-label.active {
    border-right-color: var(--primary);
}
</style>

<tab-label on:click={changeTab} class:active={$currentTab === value}>
    <slot />
    <Ripple />
</tab-label>
