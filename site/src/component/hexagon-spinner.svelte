<script>
    import {
        HexagonSpinner,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>
    HexagonSpinner
</h1>
<div>
    <HexagonSpinner />
    <HexagonSpinner size={40} />
    <HexagonSpinner size={250} />
</div>

<Markdown {docs} />
