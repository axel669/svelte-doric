<script>
    import {
        Badge,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>
    Badge
</h1>

<div>
    <Badge>
        <div>Some Content</div>
        <div slot="content">5</div>
    </Badge>
</div>

<Markdown {docs} />
