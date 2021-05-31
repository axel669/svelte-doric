<script>
    import {createEventDispatcher} from "svelte"

    import vars from "./util/vars.js"
    import Modal from "./modal.svelte"
    import Portal from "./portal.svelte"

    export let origin = {}
    export let size = {}
    export let visible = false

    const recalc = (wrapper, visible) => {
        if (visible === false) {
            return {}
        }
        const {left, top, width, height} = wrapper.getBoundingClientRect()
        return {
            left: [left, "px"],
            top: [top, "px"],
            width: [width, "px"],
            height: [height, "px"],
        }
    }

    const dispatch = createEventDispatcher()
    const cancel = () => dispatch("cancel")
    let wrapper = null

    $: position = recalc(wrapper, visible)
    $: displayVars = {...origin, ...size, ...position}
</script>

<style>
    popover-wrapper {
        position: relative;
        display: inline-grid;
    }
    doric-popover {
        position: absolute;
        left: var(--left);
        right: var(--right);
        top: var(--top);
        bottom: var(--bottom);
        overflow: visible;
        z-index: 150;
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

<popover-wrapper bind:this={wrapper}>
    <slot />
    {#if visible}
        <Modal open clear on:close={cancel}>
            <doric-popover use:vars={displayVars}>
                <popover-content>
                    <slot name="content" />
                </popover-content>
            </doric-popover>
        </Modal>
    {/if}
</popover-wrapper>
