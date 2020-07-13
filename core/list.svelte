<script context="module">
import ListItem from "./list/item.svelte"
import ListHeader from "./list/header.svelte"
import ListItemContent from "./list/content.svelte"

export {ListItem, ListHeader, ListItemContent}
;</script>

<script>
import {createEventDispatcher} from "svelte"

export let items
export let clickable
export let height
export let compact
export let style = ""
let klass = ""
export {klass as class}

const dispatch = createEventDispatcher()
const itemClick = evt => {
    if (clickable !== true) {
        return
    }
    dispatch("itemClick", items[evt.currentTarget.dataset.index].item)
}

;$: styleText = height ? `height: ${height}; ${style}` : style

;</script>

<style>
list-container {
    display: grid;
    grid-template-columns: 1fr;
    overflow: auto;
}
</style>

<list-container class:compact class={klass} style={styleText}>
    <slot />
</list-container>
