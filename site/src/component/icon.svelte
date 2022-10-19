<script>
    import {
        Icon,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>
    Icon
</h1>
<Text>
    <Icon name="house" />
    <Icon name="brands:github" />
    <Icon name="calendar" />
    <Icon name="hamburger" />
</Text>

<Markdown {docs} />
