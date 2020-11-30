<script>
    import Modal from "./modal.svelte"

    export let forceInteraction

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
        if (forceInteraction === true) {
            return
        }
        close(undefined)
    }
</script>

<Modal {open} on:close={closeOuter}>
    <slot {options} {close} />
</Modal>
