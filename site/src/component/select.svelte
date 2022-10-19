<script>
    import {
        Select,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    let value = 1
    const options = Array.from(
        { length: 50 },
        (_, i) => ({
            label: `Option #${i}`,
            value: i,
        })
    )
</script>

<h1>Select</h1>

<Text>
    Select Value: {value}
</Text>

<Select bind:value {options} label="Demo" />

<Markdown {docs} />
