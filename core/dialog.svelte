<script>
    import Modal from "./modal.svelte"

    export let persistent
    export let component

    let open = false
    let options = {}
    let resolver

    export const show = opts => new Promise(
        (resolve) => {
            resolver = resolve
            options = opts
            open = true
        }
    )
    const close = value => {
        open = false
        resolver(value)
    }
    const closeOuter = () => {
        if (persistent === true) {
            return
        }
        close(undefined)
    }
</script>

<Modal {open} {persistent} on:close={closeOuter}>
    <svelte:component this={component} {options} {close} />
</Modal>
