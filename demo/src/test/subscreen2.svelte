<script>
    import {
        Button,
        Paper,
        Screen,
    } from "@core"
    import { Flex } from "@layout"

    let scr = null
    const close = () => scr.close()
</script>

<Screen bind:this={scr}>
    <Paper square card>
        <Flex scrollable>
            {#each Array.from({ length: 20 }) as _, index}
                <area-view style="position: sticky; top: 0px;">
                    {index}
                </area-view>
            {/each}
            <Button on:tap={close}>
                Close
            </Button>
        </Flex>
    </Paper>
</Screen>
