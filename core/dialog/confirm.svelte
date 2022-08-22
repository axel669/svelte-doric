<script>
    import Flex from "../layout/flex.svelte"
    import Grid from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Paper from "../paper.svelte"
    import TitleBar from "../title-bar.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let options

    $: ({
        title = "Confirm",
        message,
        okText = "OK",
        cancelText = "Cancel",
        icon,
    } = options)

    const ok = () => close(true)
    const cancel = () => close(false)
</script>

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
        <Flex>
            {message}
        </Flex>
        <Grid cols="1fr 1fr" slot="action">
            <Button color="danger" on:tap={cancel}>
                {cancelText}
            </Button>
            <Button color="secondary" on:tap={ok}>
                {okText}
            </Button>
        </Grid>
    </Paper>
</DialogContent>
