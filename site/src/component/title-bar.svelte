<script>
    import {
        Adornment,
        Button,
        Icon,
        Paper,
        Text,
        TextInput,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>TitleBar</h1>

<Paper card>
    <TitleBar slot="title">
        Some Title

        <Adornment slot="extension">
            <TextInput label="Search" />
        </Adornment>
    </TitleBar>

    <Text>
        Some kind of content
    </Text>
</Paper>
<Paper card>
    <TitleBar slot="title">
        Some Cooler Title

        <Adornment slot="menu">
            <Button adorn>
                <Icon name="bars" />
            </Button>
        </Adornment>
        <Adornment slot="action">
            <Button adorn>
                <Icon name="copy" />
            </Button>
        </Adornment>
    </TitleBar>

    <Text>
        Some kind of content
    </Text>
</Paper>

<Markdown {docs} />
