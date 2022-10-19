<script>
    import {
        Button,
        Image,
        Paper,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Paper</h1>

<Paper>
    <Text>
        Some content
    </Text>
    <Text>
        Some more content
    </Text>
</Paper>
<Paper card>
    <Image
        source="https://wallpaperaccess.com/full/693300.png"
        height="200px"
    />

    <Button slot="action" color="primary">
        Action
    </Button>
</Paper>

<Markdown {docs} />
