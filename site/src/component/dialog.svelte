<script>
    import { Button, dialog, Alert, Confirm, Prompt } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const showAlert = () => dialog.show(Alert, { message: "This is an alert" })
    const showConfirm = () => dialog.show(
        Confirm,
        { message: "This is a confirmation" }
    )
    const showPrompt = () => dialog.show(
        Prompt,
        { message: "This is a prompt" }
    )
</script>

<h1>Dialog</h1>

<Button variant="outline" on:tap={showAlert}>
    Show Alert
</Button>
<Button variant="outline" on:tap={showConfirm}>
    Show Confirm
</Button>
<Button variant="outline" on:tap={showPrompt}>
    Show Prompt
</Button>

<Markdown {docs} />
