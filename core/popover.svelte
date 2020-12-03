<script>
    import {createEventDispatcher} from "svelte"

    import {vars} from "./style/css.js"
    import Modal from "./modal.svelte"

    export let anchor = {}
    export let visible = false
    export let modal = false

    const dispatch = createEventDispatcher()
</script>

<style>
    popover-wrapper {
        position: relative;
        display: inline-grid;
    }
    doric-popover {
        display: none;
        position: absolute;
        z-index: +150;
        left: var(--left);
        right: var(--right);
        top: var(--top);
        bottom: var(--bottom);
    }
    doric-popover.visible {
        display: block;
    }
</style>

<popover-wrapper>
    <slot />
    {#if modal}
        <Modal open={visible} clear on:close={() => dispatch("cancel")} />
    {/if}
    <doric-popover class:visible use:vars={anchor}>
        <slot name="content" />
    </doric-popover>
</popover-wrapper>
