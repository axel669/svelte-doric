<script>
    import Modal from "./modal.svelte"

    export let open = false
    export let persistent = false

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

<style>
    control-drawer {
        position: absolute;
        top: 0px;
        right: 0px;
        height: 100vh;
        min-width: 25vw;
        background-color: var(--card-background);
    }
</style>

<Modal bind:open on:close {persistent}>
    <control-drawer transition:drawerSlide>
        <slot />
    </control-drawer>
</Modal>
