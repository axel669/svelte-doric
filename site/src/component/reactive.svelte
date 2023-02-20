<script>
    import {
        Reactive,
        Paper,
        Text,
        Button,
        CircleSpinner as Spinner,

        handler$,
    } from "@core"

    // import Markdown from "../app/markdown.svelte"
    // import docs from "@docs"

    const log = handler$(
        (...args) => console.log(args)
    )
</script>

<h1>Reactive</h1>

<Paper card>
    <Reactive let:visible let:show>
        <Button on:click={show(log())} variant="fill" color="primary" disabled={visible}>
            Visible? ({visible})
        </Button>
    </Reactive>
    <Reactive let:visible let:show>
        <Button on:click={show(log())} variant="outline" color="secondary">
            Run a thing!
            <Reactive area>
                <Spinner size={20} />
            </Reactive>
        </Button>
    </Reactive>
</Paper>

<!-- <Markdown {docs} /> -->
