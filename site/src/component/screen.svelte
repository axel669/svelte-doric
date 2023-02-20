<script>
    import { Button } from "@core"

    import Subscreen from "./screen/subscreen.svelte"
    import screen from "../app/screen.mjs"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Screen</h1>

<Button on:click={() => $screen.openStack(Subscreen)}>
    Open Subscreen
</Button>

<Markdown {docs} />
