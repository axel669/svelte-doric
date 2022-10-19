<script>
    import {
        Grid,
        Switch,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Switch</h1>

<Grid cols="1fr 1fr">
    <Switch color="default">
        Default
    </Switch>
    <Switch color="primary">
        Primary
    </Switch>
    <Switch color="secondary">
        Secondary
    </Switch>
    <Switch color="danger">
        Danger
    </Switch>
</Grid>

<Markdown {docs} />
