<script>
import Modal from "./modal.svelte"

export let open = false

const drawerSlide = (node, options) => {
    return {
        delay: 0,
        duration: 200,
        css: (t, u) => `
            transform: translateX(-${u * 100}%);
            opacity: ${t};
        `
    }
}

;</script>

<style>
drawer-wrapper {
    position: absolute;
    top: 0px;
    left: 0px;
    height: 100vh;
    min-width: 5vw;
    background-color: var(--card-background);
}
</style>

<Modal {open} on:close>
    <drawer-wrapper transition:drawerSlide>
        <slot />
    </drawer-wrapper>
</Modal>
