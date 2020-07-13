<script context="module">
import {tabContext} from "../tabs.svelte"
;</script>

<script>
import {getContext} from "svelte"

export let value

const currentTab = getContext(tabContext)
;</script>

<style>
tab-panel {
    display: none;
    grid-area: panel;
}
tab-panel.active {
    display: block;
}
</style>

<tab-panel class:active={$currentTab === value}>
    <slot />
</tab-panel>
