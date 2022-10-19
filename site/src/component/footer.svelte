<script>
    import {
        Button,
        Footer,
        Image,
        Paper,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Footer</h1>

<Paper card litemAlign="center">
    <Image
        source="https://wallpaperaccess.com/full/693300.png"
        height="200px"
    />

    <Footer slot="action">
        <Button color="primary">
            Do Something
        </Button>
    </Footer>
</Paper>

<Markdown {docs} />
