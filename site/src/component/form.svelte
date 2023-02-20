<script>
    import {
        Reactive,
        Paper,
        Text,
        Button,
        CircleSpinner as Spinner,
        Form,

        handler$,
    } from "@core"

    // import Markdown from "../app/markdown.svelte"
    // import docs from "@docs"

    let value = {}
    const items = [
        {
            type: "text",
            name: "name",
            props: {
                label: "Name",
                transform: text => text.toUpperCase(),
                initial: "blep"
            }
        },
        {
            type: "text",
            name: "time",
            props: {
                label: "time",
                transform: text => new Date(text),
                validate: date => {
                    if (isNaN(date.valueOf()) === true) {
                        return "Invalid date"
                    }
                    return null
                }
            }
        },
        {
            type: "select",
            name: "choice",
            props: {
                options: [
                    { label: "test 1", value: "test1" },
                    { label: "test 2", value: "test2" },
                    { label: "test 3", value: "test3" },
                ]
            }
        },
        {
            type: "toggle",
            name: "checked",
            props: {
                checkbox: true,
                label: "Feels active?"
            }
        },
    ]
</script>

<h1>Form</h1>

<Paper card>
    <Form {items} bind:value />
    <pre>{JSON.stringify(value, null, 4)}</pre>
</Paper>

<!-- <Markdown {docs} /> -->
