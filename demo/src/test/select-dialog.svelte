<script>
    import {
        Button,
        Icon,
        Paper,
        Select,
        TitleBar,
    } from "@core"
    import { Action, Flex, Grid } from "@layout"
    import { DialogContent } from "@dialog"

    export let close
    export let options

    $: ({
        title = "Alert",
        message,
        okText = "OK",
        icon,
    } = options)
    let value = 0
    const items = [
        { label: "First", value: 0 },
        { label: "Second", value: 1 },
        { label: "Third", value: 2 },
    ]

    const ok = () => close(true)
    console.log("wat")
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
        <Action>
            <Flex>
                {message}
            </Flex>
            <Grid>
                <Select label="Test" options={items} bind:value />
                <Button color="secondary" on:tap={ok}>
                    {okText}
                </Button>
            </Grid>
        </Action>
    </Paper>
</DialogContent>
