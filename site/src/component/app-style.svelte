<script>
    import {
        Avatar,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<TitleBar>
    AppStyle
</TitleBar>

<Markdown {docs} />
