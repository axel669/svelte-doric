<script>
    import ActionLayout from "../layout/action.svelte"
    import FlexLayout from "../layout/flex.svelte"
    import GridLayout from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Card from "../card.svelte"
    import TextInput from "../text-input.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let options

    $: ({
        title = "Confirm",
        message,
        placeholder = "",
        okText = "OK",
        cancelText = "Cancel",
    } = options)

    const ok = () => close(value)
    const submitOK = (evt) => {
        evt.preventDefault()
        evt.stopPropagation()
        ok()
    }
    const cancel = () => close(null)

    let value = ""
    let textInput = null

    $: if (textInput !== null) {
        textInput.focus()
    }
</script>

<style>
    form {
        display: grid;
    }
</style>

<DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    <Card>
        <svelte:fragment slot="title">
            {title ?? ""}
        </svelte:fragment>
        <ActionLayout>
            <FlexLayout direction="column">
                {message}
                <form on:submit={submitOK}>
                    <TextInput
                        bind:value
                        bind:this={textInput}
                        {placeholder}
                        type="text"
                        variant="outline"
                    />
                </form>
            </FlexLayout>
            <GridLayout cols={2}>
                <Button color="danger" on:tap={cancel}>
                    {cancelText}
                </Button>
                <Button color="secondary" on:tap={ok}>
                    {okText}
                </Button>
            </GridLayout>
        </ActionLayout>
    </Card>
</DialogContent>
