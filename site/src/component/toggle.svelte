<script>
    import {
        Grid,
        Toggle,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    let on = false
</script>

<Grid cols="1fr 1fr">
    <Toggle col="span 2" label="Checkbox" bind:on checkbox />
    <Toggle color="primary" col="span 2" label="Toggle" bind:on />
    <Toggle color="secondary" label="Checkbox" bind:on iconpos="right" checkbox />
    <Toggle color="danger" label="Toggle" bind:on iconpos="right" />

    <Toggle color="danger" disabled label="Checkbox" bind:on checkbox />
    <Toggle color="secondary" disabled label="Toggle" bind:on />
    <Toggle color="primary" col="span 2" disabled label="Checkbox" bind:on iconpos="right" checkbox />
    <Toggle col="span 2" disabled label="Toggle" bind:on iconpos="right" />
</Grid>

<Markdown {docs} />
