<script context="module">
    const drawerSlide = (node, options) => {
        return {
            delay: 0,
            duration: 250,
            css: (t, u) => `
                transform: translateX(-${u * 100}%);
                opacity: ${t};
            `
        }
    }

    let show
    export const openDrawer = (...args) => show(...args)
</script>

<script>
    import Modal from "./modal.svelte"

    let current = null
    let props = {}
    let close = null

    show = (component, opts) => new Promise(
        (resolve) => {
            if (current !== null) {
                resolve(null)
                return
            }

            close = (value) => {
                current = null
                props = {}
                resolve(value)
            }
            props = {
                ...opts,
                close,
            }
            current = component
        }
    )
</script>

<style>
    drawer-wrapper {
        position: absolute;
        top: 0px;
        left: 0px;
        height: 100vh;
        min-width: 10vw;
        background-color: var(--card-background);
    }
</style>

{#if current !== null}
    <Modal on:close={() => close(undefined)}>
        <drawer-wrapper transition:drawerSlide>
            <svelte:component this={current} {...props} />
        </drawer-wrapper>
    </Modal>
{/if}
