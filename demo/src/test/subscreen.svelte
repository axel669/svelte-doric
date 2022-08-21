<script>
    import {
        Button,
        Paper,
    } from "@core"
    import { Flex } from "@layout"

    import Screen from "./screen.svelte"
    import Subscreen2 from "./subscreen2.svelte"

    export let stack = false
    export let stackNum

    let substack = false
</script>

<Screen {stackNum} stack={substack} let:stackNum>
    <Paper square card>
        <Flex scrollable>
            <Button on:tap={() => substack = true}>
                Next
            </Button>
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

    <Subscreen2 bind:stack={substack} {stackNum} slot="stack" />
</Screen>
