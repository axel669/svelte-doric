<script>
    import {
        Button,
        Paper,
        Screen,

        Flex,
    } from "@core"

    let scr = null
    const close = () => scr.close()
</script>

<Screen bind:this={scr}>
    <Flex padding="0px">
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
    </Flex>
</Screen>
