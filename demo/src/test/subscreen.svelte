<script>
    import {
        AppBar,
        Button,
        Footer,
        Paper,
        Screen,
    } from "@core"
    import { Flex } from "@layout"

    import { getContext } from "svelte"

    import Subscreen2 from "./subscreen2.svelte"

    export let value

    let scr = null
    const open = () => scr.openStack(Subscreen2)
</script>

<Screen bind:this={scr} fullTitle>
    <AppBar slot="title">
        Testing - #{value}
    </AppBar>
    <Paper square card>
        <Flex scrollable>
            <Button on:tap={open}>
                Next
            </Button>
            {#each Array.from({ length: 20 }) as _, index}
                <area-view style="position: sticky; top: 0px;">
                    {index}
                </area-view>
            {/each}
            <Button on:tap={() => scr.close()}>
                Close
            </Button>
        </Flex>
    </Paper>

    <Footer slot="footer">
        Some kind of footery stuff
    </Footer>
</Screen>
