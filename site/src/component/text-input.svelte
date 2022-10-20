<script>
    import {
        Adornment,
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
<TextInput label="Currency">
    <Adornment slot="start">
        <Text adorn>$</Text>
    </Adornment>
</TextInput>

<Markdown {docs} />
