<script>
    import {fade} from "svelte/transition"

    import Modal from "./modal.svelte"
    import Portal from "./portal.svelte"

    import vars from "./util/vars.js"
    import grid from "./util/grid.mjs"

    export let anchor = { left: "0px", top: "100%" }
    export let size = { width: "100%", height: "auto" }
    export let clear = false

    const varReset =
        "--top: unset; --left: unset; --bottom: unset; --right: unset;"
    const anim = {
        duration: 250
    }

    $: contentVars = {
        ...anchor,
        ...size,
    }
    let element = null
    let visible = false
    const show = () => visible = true
    const hide = () => visible = false
</script>

<style>
    doric-popover {
        position: relative;
        display: inline-grid;
        overflow: visible;
    }

    content-wrapper {
        position: absolute;
        display: grid;
        z-index: 600;

        top: var(--top);
        left: var(--left);
        bottom: var(--bottom);
        right: var(--right);
        width: var(--width);
        height: var(--height);
    }
</style>

<doric-popover bind:this={element} style={varReset} use:grid={$$props}>
    <slot {show} />

    {#if visible}
        <Modal open {clear} />
        <content-wrapper use:vars={contentVars} transition:fade={anim}>
            <slot name="content" {hide} />
        </content-wrapper>
    {/if}
</doric-popover>
