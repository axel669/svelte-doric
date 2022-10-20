<script>
    import { Grid } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<style>
    grid-item {
        display: block;
        padding: 2px;
        border: 1px solid var(--text-normal);
    }
    grid-item::after {
        content: "Grid Item";
    }
</style>

<h1>Grid</h1>

<Grid cols="1fr 1fr">
    <Grid>
        <grid-item />
    </Grid>

    <grid-item />
    <grid-item />
    <grid-item />
</Grid>

<Markdown {docs} />
