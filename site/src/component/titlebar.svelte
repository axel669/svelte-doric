<script>
    import {
        Button,
        Icon,
        Paper,
        Text,
        TextInput,
        Titlebar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Titlebar</h1>

<Paper card>
    <Titlebar slot="title">
        Some Title

        <TextInput label="Search" adorn slot="extension" />
    </Titlebar>

    <Text>
        Some kind of content
    </Text>
</Paper>
<Paper card>
    <Titlebar slot="title">
        Some Cooler Title

        <Button adorn slot="menu">
            <Icon name="bars" />
        </Button>
        <Button adorn slot="action">
            <Icon name="copy" />
        </Button>
    </Titlebar>

    <Text>
        Some kind of content
    </Text>
</Paper>

<Markdown {docs} />
