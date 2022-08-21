<script>
    import {
        Button,
        Paper,
    } from "@core"
    import { Flex } from "@layout"

    import Screen from "./screen.svelte"

    export let stack = false
    export let stackNum
</script>

<Screen {stackNum}>
    <Paper square card>
        <Flex scrollable>
            {#each Array.from({ length: 20 }) as _, index}
                <area-view style="position: sticky; top: 0px;">
                    {index}
                </area-view>
            {/each}
            <Button on:tap={() => stack = false}>
                Close
            </Button>
        </Flex>
    </Paper>
</Screen>
