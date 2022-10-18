<script>
    import {
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<TitleBar>
    Baseline
</TitleBar>

<Markdown {docs} />
