<script>
    import {
        Adornment,
        Button,
        Grid,
        Icon,
        Text,
        TextInput,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    let value = ""
</script>

<h1>TextInput</h1>

<TextInput label="Stuff" bind:value />
<TextInput label="Stuff" flat bind:value />

<TextInput>
    <Adornment slot="start">
        <Text adorn>
            <Icon name="search" />
        </Text>
    </Adornment>
</TextInput>

<Grid cols="1fr 1fr" padding="0px">
    <TextInput label="Currency">
        <Adornment slot="start">
            <Text adorn>$</Text>
        </Adornment>
    </TextInput>

    <TextInput label="Search Params">
        <Adornment slot="end">
            <Button adorn>Find</Button>
        </Adornment>
    </TextInput>
</Grid>

<Markdown {docs} />
