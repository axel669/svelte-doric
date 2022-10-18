<script>
    import {
        Badge,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<TitleBar>
    Badge
</TitleBar>

<div>
    <Badge>
        <div>Some Content</div>
        <div slot="content">5</div>
    </Badge>
</div>

<Markdown {docs} />
