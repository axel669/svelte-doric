<script>
    import Markdown from "./markdown.svelte"

    import docs from "../../../README.md"
    import changelog from "../../../CHANGELOG.md"
</script>

<Markdown {docs} />
<Markdown docs={changelog} />
