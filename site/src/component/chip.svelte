<script>
    import {
        Button,
        Chip,
        Flex,
        Icon,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const chipColors = ["default", "primary", "secondary", "danger"]

    let checked = true
</script>

<h1>
    Chip
</h1>
<Flex direction="row">
    {#each chipColors as color}
        <Chip {color} clickable label={color} />
    {/each}
</Flex>
<Flex direction="row">
    {#each chipColors as color}
        <Chip {color} label={color}>
            <Button compact slot="start">
                <Icon name="close" />
            </Button>
        </Chip>
    {/each}
</Flex>

<Markdown {docs} />
