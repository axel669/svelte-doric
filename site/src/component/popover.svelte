<script>
    import {
        Button,
        Paper,
        Popover,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<h1>Popover</h1>

<Popover let:show let:hide>
    <Button on:click={show} variant="outline">
        Show Popover
    </Button>

    <Paper card slot="content" on:click={open}>
        <Text>
            Popover Content
        </Text>

        <Button slot="action" color="secondary" on:click={hide}>
            Close
        </Button>
    </Paper>
</Popover>

<Popover clear let:show let:hide>
    <Button on:click={show} variant="outline">
        Show Popover (Clear Modal)
    </Button>

    <Paper card slot="content" on:click={open}>
        <Text>
            Popover Content
        </Text>

        <Button slot="action" color="secondary" on:click={hide}>
            Close
        </Button>
    </Paper>
</Popover>

<Markdown {docs} />
