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

    import TestInput from "../test/text-input.svelte"

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
</Grid>

<Markdown {docs} />
