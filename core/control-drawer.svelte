<script context="module">
    const drawerSlide = (node, options) => {
        return {
            delay: 0,
            duration: 250,
            css: (t, u) => `
                transform: translateX(${u * 100}%);
                opacity: ${t};
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
        right: 0px;
        height: 100%;
        min-width: 25vw;
        background-color: var(--card-background);
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
