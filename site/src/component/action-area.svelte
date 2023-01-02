<script>
    import {
        ActionArea,
        Paper,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>
    ActionArea
</h1>

<Paper card>
    <ActionArea>
        Some Content
    </ActionArea>
</Paper>

<Markdown {docs} />
