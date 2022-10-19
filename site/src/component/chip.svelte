<script>
    import {
        Adornment,
        Button,
        Chip,
        Flex,
        Icon,
        TitleBar,
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
            <Adornment slot="start">
                <Button round="24px">
                    <Icon name="close" />
                </Button>
            </Adornment>
        </Chip>
    {/each}
</Flex>

<Markdown {docs} />
