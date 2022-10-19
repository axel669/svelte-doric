<script>
    import {
        Image,
        Paper,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Image</h1>

<Paper litemAlign="start" flat>
    <Image
        source="https://wallpaperaccess.com/full/693300.png"
        height="200px"
    />
    <span style="border: 1px solid var(--primary); padding: 2px;">
        <Image
            source="https://wallpaperaccess.com/full/693300.png"
            height="200px"
            width="200px"
        />
    </span>
</Paper>

<Markdown {docs} />
