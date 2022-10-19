<script>
    import {
        CircleSpinner,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const chipColors = ["default", "primary", "secondary", "danger"]

    let checked = true
</script>

<h1>
    CircleSpinner
</h1>
<div>
    <CircleSpinner />
    <CircleSpinner size={40} />
    <CircleSpinner size={250} />
</div>

<Markdown {docs} />
