<script>
    import Flex from "../layout/flex.svelte"
    import Grid from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Paper from "../paper.svelte"
    import Reactive from "../reactive.svelte"
    import Spinner from "../circle-spinner.svelte"
    import Text from "../text.svelte"
    import TextInput from "../text-input.svelte"
    import Titlebar from "../titlebar.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let title = "Prompt"
    export let message
    export let placeholder = ""
    export let okText = "OK"
    export let cancelText = "Cancel"
    export let icon
    export let reaction = null

    $: reactor = reaction !== null

    const ok = async () => {
        if (reaction === null) {
            close(value)
            return
        }
        close(
            await reaction(value)
        )
    }
    const submitOK = (evt) => {
        evt.preventDefault()
        evt.stopPropagation()
        ok()
    }
    const cancel = () => close(false)

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
    <Reactive let:show let:visible>
        <Paper card>
            <svelte:fragment slot="title">
                {#if title}
                    <Titlebar compact>
                        {#if icon}
                            <Icon name={icon} />
                        {/if}
                        {title}
                    </Titlebar>
                {/if}
            </svelte:fragment>
            <Text>
                {message}
            </Text>
            <form on:submit={show(submitOK, reactor)}>
                <TextInput
                    bind:value
                    bind:this={textInput}
                    {placeholder}
                    type="text"
                    variant="outline"
                    disabled={visible}
                />
            </form>
            <Grid cols="1fr 1fr" slot="action">
                <Button color="danger" on:click={cancel} disabled={visible}>
                    {cancelText}
                </Button>
                <Button
                color="secondary"
                on:click={show(ok, reactor)}
                disabled={visible}>
                    {okText}
                    <Reactive area>
                        <Spinner size={20} />
                    </Reactive>
                </Button>
            </Grid>
        </Paper>
    </Reactive>
</DialogContent>
