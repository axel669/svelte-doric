<script context="module">
    let show
    export const showDialog = (...args) => show(...args)
</script>

<script>
    import Modal from "./modal.svelte"

    let dialogs = []

    const add = (dialog) => {
        dialogs = [...dialogs, dialog]
    }
    const remove = (id) => {
        dialogs = dialogs.filter(
            (dialog) => dialog.id !== id
        )
    }

    show = (component, opts) => new Promise(
        (resolve) => {
            const id = `${Date.now()}:${Math.random().toString(16)}`
            const close = (value) => {
                remove(id)
                resolve(value)
            }

            const dialog = {
                id,
                component,
                persistent: opts.persistent,
                props: {
                    ...opts,
                    close,
                },
                modalClose: () => close(undefined),
            }

            add(dialog)
        }
    )
</script>

{#each dialogs as {component, modalClose, persistent, props}}
    <Modal {persistent} on:close={modalClose}>
        <svelte:component this={component} {...props} />
    </Modal>
{/each}
