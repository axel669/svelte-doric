<script>
    import {
        Button,
        Grid,
        Icon,
        Text,
        TextInput,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    import TestInput from "../test/text-input.svelte"

    let transformed = undefined
    const transform = (text) => text.split(",").map(t => t.trim())
    const validate = (value) => {
        if (/^[a-z, ]*$/i.test(value) === false) {
            return "only a-z allowed"
        }
        return null
    }

    let value = "text"
</script>

<h1>TextInput</h1>


<Grid cols="1fr 1fr" padding="0px" autoRow="max-content">
    <TextInput label="Testing?" bind:value col="span 2">
        <Text slot="start" adorn>
            <Icon name="search" />
        </Text>
    </TextInput>
    <TextInput bind:value />
    <TextInput bind:value extra="wat" />

    <TextInput label="Testing?" bind:value flat col="span 2">
        <Text slot="start" adorn>
            <Icon name="search" />
        </Text>
    </TextInput>
    <TextInput bind:value flat />
    <TextInput bind:value extra="wat" flat />

    <TextInput label="Search">
        <Button adorn slot="start">Find</Button>
    </TextInput>

    <TextInput label="Search Params">
        <Button adorn slot="end">Find</Button>
    </TextInput>

    <TextInput label="Search" error="Not Found">
        <Button adorn slot="start">Find</Button>
    </TextInput>

    <TextInput label="Search Params" error="Who even knows">
        <Button adorn slot="end">Find</Button>
    </TextInput>

    <TextInput
        {validate}
        {transform}
        col="span 2"
        label="Transform + Validate"
        extra="List of words, comma separated, outputs array"
        bind:tvalue={transformed}
    />
    <pre>{JSON.stringify(transformed)}</pre>
</Grid>

<Markdown {docs} />
