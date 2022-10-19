<script>
    import {
        Checkbox,
        Flex,
        Grid,
        Text,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const themeColors = ["default", "primary", "secondary", "danger"]

    let checked = true
</script>

<h1>
    Checkbox
</h1>
<Grid cols="1fr 1fr 1fr 1fr">
    {#each themeColors as color}
        <Checkbox {color} bind:checked>
            <Flex>
                <Text align="center">{color}</Text>
            </Flex>
        </Checkbox>
    {/each}
    {#each themeColors as color}
        <Checkbox {color} bind:checked disabled>
            <Flex>
                <Text align="center">disabled</Text>
                <Text align="center">{color}</Text>
            </Flex>
        </Checkbox>
    {/each}
</Grid>

<Markdown {docs} />
