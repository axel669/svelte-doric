<script>
    import {
        Paper,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Text</h1>

<Text>Regular Text</Text>
<Text color="primary">Primary</Text>
<Text color="secondary">Secondary</Text>
<Text color="danger">Danger</Text>
<Text subtitle>Subtitle</Text>

<Paper>
    <div>
        <Text>a line of text</Text>
        <Text block>Block text</Text>
        <Text>another line of text</Text>
    </div>
</Paper>

<Markdown {docs} />
