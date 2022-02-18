<script>
    import ActionLayout from "../layout/action.svelte"
    import FlexLayout from "../layout/flex.svelte"
    import GridLayout from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Paper from "../paper.svelte"
    import TitleBar from "../title-bar.svelte"

    import DialogContent from "./content.svelte"

    export let close
    export let options

    $: ({
        title = "Alert",
        message,
        okText = "OK",
        icon,
    } = options)

    const ok = () => close(true)
</script>

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
        <ActionLayout>
            <FlexLayout>
                {message}
            </FlexLayout>
            <GridLayout>
                <Button color="secondary" on:tap={ok}>
                    {okText}
                </Button>
            </GridLayout>
        </ActionLayout>
    </Paper>
</DialogContent>
