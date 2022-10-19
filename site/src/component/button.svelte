<script>
    import {
        Button,
        Flex,
        Grid,
        Text,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const buttonTypes = ["normal", "outline", "fill"]
    const buttonColors = ["default", "primary", "secondary", "danger"]
</script>

<h1>
    Button
</h1>
<Grid cols="1fr 1fr 1fr 1fr">
    {#each buttonTypes as variant}
        {#each buttonColors as color}
            <Button {variant} {color}>
                <Flex>
                    <Text align="center">{variant}</Text>
                    <Text align="center">{color}</Text>
                </Flex>
            </Button>
        {/each}
        {#each buttonColors as color}
            <Button {variant} {color} disabled>
                <Flex>
                    <Text align="center">disabled</Text>
                    <Text align="center">{variant}</Text>
                    <Text align="center">{color}</Text>
                </Flex>
            </Button>
        {/each}
    {/each}
</Grid>

<Markdown {docs} />
