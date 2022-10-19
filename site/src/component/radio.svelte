<script>
    import {
        Paper,
        Radio,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    let value = "first"
    const radioOptions = [
        {label: "First", value: "first"},
        {label: "Second", value: "second"},
        {label: "Numeric", value: 0},
    ]
</script>

<h1>Radio</h1>

<Text>
    Radio Value: {value}
</Text>

<Paper card>
    <Radio bind:value options={radioOptions} cols={2} />
</Paper>

<Paper card>
    <Radio bind:value options={radioOptions} cols={2} let:option>
        <div slot="label">
            {option.label.toUpperCase()}
        </div>
    </Radio>
</Paper>

<Markdown {docs} />
