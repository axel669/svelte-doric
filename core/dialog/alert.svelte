<script>
    import Flex from "../layout/flex.svelte"
    import Grid from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Paper from "../paper.svelte"
    import Text from "../text.svelte"
    import TitleBar from "../title-bar.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let title = "Alert"
    export let message
    export let okText = "OK"
    export let icon

    const ok = () => close(true)
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
        <Text>
            {message}
        </Text>
        <Grid slot="action" cols="1fr">
            <Button color="secondary" on:click={ok}>
                {okText}
            </Button>
        </Grid>
    </Paper>
</DialogContent>
