<!-- <script context="module">
import ListItem from "./list/item.svelte"
import ListHeader from "./list/header.svelte"
import ListItemContent from "./list/content.svelte"

export {ListItem, ListHeader, ListItemContent}
;</script> -->

<script>
    // import {createEventDispatcher} from "svelte"
    import Divider from "./divider.svelte"

    export let items = []
    // export let clickable
    export let height
    export let compact
    let klass = ""
    export {klass as class}

    // const dispatch = createEventDispatcher()
    // const itemClick = evt => {
    //     if (clickable !== true) {
    //         return
    //     }
    //     dispatch("itemClick", items[evt.currentTarget.dataset.index].item)
    // }

    // ;$: styleText = height ? `height: ${height}; ${style}` : style
;</script>

<style>
    doric-list {
        display: grid;
        grid-template-columns: 1fr;
        overflow: auto;
        height: var(--list-height);
    }

    doric-list > :global(list-item, list-header) {
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
    doric-list > :global(list-header > list-header-content) {
        font-size: var(--text-size-header);
        font-weight: 700;
    }
    doric-list > :global(list-item > a) {
        position: absolute;
        top: 0px;
        left: 0px;
        bottom: 0px;
        right: 0px;
        opacity: 0;
    }
    doric-list > :global(list-item[dividers]) {
        border-top: 1px solid var(--text-secondary);
        border-bottom: 1px solid var(--text-secondary);
        margin-top: -1px;
    }

    doric-list > :global(list-item > list-item-content, list-header > list-header-content) {
        grid-area: content;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
        grid-area: content;
    }
    doric-list > :global(list-item[control]) {
        padding: 0px;
    }

    list-item {
        border: 1px solid blue;
    }
</style>

<doric-list class:compact class={klass} style="--list-height: {height}">
    {#each items as item}
        {#if item.header !== undefined}
            <slot name="header" {item}>
                <list-header>
                    <list-header-content>
                        {item.header}
                    </list-header-content>
                </list-header>
            </slot>
        {:else}
            <slot name="item" {item}>
                <list-item>
                    <list-item-content>
                        {item ?? ""}
                    </list-item-content>
                </list-item>
            </slot>
        {/if}
    {/each}
</doric-list>
