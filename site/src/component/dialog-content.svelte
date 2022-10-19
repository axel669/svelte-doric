<script>
    import { Text } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const href =
        "https://github.com/axel669/svelte-doric/tree/master/core/dialog"
</script>

<h1>DialogContent</h1>

<Text>
    Examples can be found in the built-in
    <a {href} target="_blank">dialog components</a>
</Text>

<Markdown {docs} />
