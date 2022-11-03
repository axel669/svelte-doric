<script>
    import Flex from "../layout/flex.svelte"
    import Grid from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Paper from "../paper.svelte"
    import Text from "../text.svelte"
    import TextInput from "../text-input.svelte"
    import TitleBar from "../title-bar.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let title = "Prompt"
    export let message
    export let placeholder = ""
    export let okText = "OK"
    export let cancelText = "Cancel"
    export let icon

    const ok = () => close(value)
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
    <Paper card>
        <svelte:fragment slot="title">
            {#if title}
                <TitleBar compact>
                    {#if icon}
                        <Icon name={icon} />
                    {/if}
                    {title}
                </TitleBar>
            {/if}
        </svelte:fragment>
        <Text>
            {message}
        </Text>
        <form on:submit={submitOK}>
            <TextInput
                bind:value
                bind:this={textInput}
                {placeholder}
                type="text"
                variant="outline"
            />
        </form>
        <Grid cols="1fr 1fr" slot="action">
            <Button color="danger" on:click={cancel}>
                {cancelText}
            </Button>
            <Button color="secondary" on:click={ok}>
                {okText}
            </Button>
        </Grid>
    </Paper>
</DialogContent>
