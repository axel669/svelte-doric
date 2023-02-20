<script>
    import Flex from "../layout/flex.svelte"
    import Grid from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Paper from "../paper.svelte"
    import Text from "../text.svelte"
    import Titlebar from "../titlebar.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let title = "Confirm"
    export let message
    export let okText = "OK"
    export let cancelText = "Cancel"
    export let icon

    const ok = () => close(true)
    const cancel = () => close(false)
</script>

<DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
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
