<script>
    import {
        AppBar,
        Button,
        Footer,
        Paper,
        Screen,

        Flex,
    } from "@core"

    import { getContext } from "svelte"

    import Subscreen2 from "./subscreen2.svelte"

    export let value

    let scr = null
    const open = () => scr.openStack(Subscreen2)
</script>

<Screen bind:this={scr}>
    <AppBar slot="title">
        Testing - #{value}
    </AppBar>
    <Paper square card>
        <Flex scrollable center>
            <Button on:tap={open}>
                Next
            </Button>
            {#each Array.from({ length: 20 }) as _, index}
                <area-view style="position: sticky; top: 0px;">
                    {index}
                </area-view>
            {/each}
            <Button on:tap={() => scr.close(new Date().toLocaleString())}>
                Close
            </Button>
        </Flex>
    </Paper>

    <Footer slot="footer" bordered>
        Some kind of footery stuff
    </Footer>
</Screen>
