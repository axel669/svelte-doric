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
        title = "Confirm",
        message,
        okText = "OK",
        cancelText = "Cancel",
    } = options)

    const ok = () => close(true)
    const cancel = () => close(false)
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
