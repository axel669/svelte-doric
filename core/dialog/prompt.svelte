<script>
    import Action from "../layout/action.svelte"
    import Flex from "../layout/flex.svelte"
    import Grid from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Paper from "../paper.svelte"
    import TextInput from "../text-input.svelte"
    import TitleBar from "../title-bar.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let options

    $: ({
        title = "Confirm",
        message,
        placeholder = "",
        okText = "OK",
        cancelText = "Cancel",
        icon,
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
    <Paper card>
        {#if title}
            <TitleBar compact>
                {#if icon}
                    <Icon name={icon} />
                {/if}
                {title}
            </TitleBar>
        {/if}
        <Action>
            <Flex direction="column">
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
            </Flex>
            <Grid cols={2}>
                <Button color="danger" on:tap={cancel}>
                    {cancelText}
                </Button>
                <Button color="secondary" on:tap={ok}>
                    {okText}
                </Button>
            </Grid>
        </Action>
    </Paper>
</DialogContent>
