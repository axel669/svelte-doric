<script context="module">
    const drawerSlide = (node, options) => {
        return {
            delay: 0,
            duration: 250,
            css: (t, u) => `
                transform: translateY(${u * -100}%) translateX(-50%);
            `
        }
    }
</script>

<script>
    import Modal from "./modal.svelte"

    export let persistent = false

    let show = false
    export const open = () => show = true
    export const close = () => show = false
</script>

<style>
    control-drawer {
        position: absolute;
        top: 0px;
        left: 50%;
        transform: translateX(-50%);
        height: 80%;
        min-width: min(400px, 65%);
        max-width: 85%;
        background-color: var(--card-background);
        border: 1px solid var(--primary);
        border-top-width: 0px;
        overflow-y: auto;
    }
</style>

{#if show}
    <Modal on:close={close} {persistent}>
        <control-drawer transition:drawerSlide>
            <slot />
        </control-drawer>
    </Modal>
{/if}
