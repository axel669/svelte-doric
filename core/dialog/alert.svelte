<script>
    import ActionLayout from "../layout/action.svelte"
    import FlexLayout from "../layout/flex.svelte"
    import GridLayout from "../layout/grid.svelte"

    import Button from "../button.svelte"
    import Card from "../card.svelte"
    import DialogContent from "./content.svelte"

    export let close
    export let options

    $: ({
        title = "Alert",
        message,
        okText = "OK",
    } = options)

    const ok = () => close(true)
</script>

<DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    <Card>
        <svelte:fragment slot="title">
            {title ?? ""}
        </svelte:fragment>
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
    </Card>
</DialogContent>
