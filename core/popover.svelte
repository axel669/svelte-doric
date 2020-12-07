<script>
    import {createEventDispatcher} from "svelte"

    import {vars} from "./style/css.js"
    import Modal from "./modal.svelte"

    export let origin = {}
    export let size = {}
    export let visible = false
    export let modal = false

    const dispatch = createEventDispatcher()

    $: displayVars = {...origin, ...size}
</script>

<style>
    popover-wrapper {
        position: relative;
        display: inline-grid;
    }
    doric-popover {
        position: absolute;
        left: 0px;
        right: 0px;
        top: 0px;
        bottom: 0px;
        overflow: visible;
        z-index: +150;
    }
    popover-content {
        display: inline-block;
        position: relative;
        top: var(--y);
        left: var(--x);
        transform: translate(
            var(--tx, 0%),
            var(--ty, 0%)
        );
        min-width: var(--width);
        min-height: var(--height);
    }
</style>

<popover-wrapper>
    <slot />
    {#if modal}
        <Modal open={visible} clear on:close={() => dispatch("cancel")} />
    {/if}
    {#if visible}
        <doric-popover use:vars={displayVars}>
            <popover-content>
                <slot name="content" />
            </popover-content>
        </doric-popover>
    {/if}
</popover-wrapper>
