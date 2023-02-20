<script>
    import { Button, dialog, Alert, Confirm, Prompt } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const showAlert = () => dialog.show(Alert, { message: "This is an alert" })
    const showConfirm = async () => console.log(
        await dialog.show(
            Confirm,
            { message: "This is a confirmation" }
        )
    )
    const wait = (time) => new Promise(
        resolve => setTimeout(resolve, time)
    )
    const showConfirmR = async () => console.log(
        await dialog.show(
            Confirm,
            {
                message: "This is a confirmation + reaction",
                reaction: async () => {
                    await wait(2000)
                    return [true]
                }
            }
        )
    )
    const showPrompt = async () => console.log(
        await dialog.show(
            Prompt,
            { message: "This is a prompt" }
        )
    )
    const showPromptR = async () => console.log(
        await dialog.show(
            Prompt,
            {
                message: "This is a prompt + reaction",
                reaction: async (value) => {
                    await wait(2000)
                    return [value]
                }
            }
        )
    )
</script>

<h1>Dialog</h1>

<Button variant="outline" on:click={showAlert}>
    Show Alert
</Button>
<Button variant="outline" on:click={showConfirm}>
    Show Confirm
</Button>
<Button variant="outline" on:click={showPrompt}>
    Show Prompt
</Button>

<Button variant="outline" on:click={showConfirmR}>
    Show Confirm Reactive
</Button>
<Button variant="outline" on:click={showPromptR}>
    Show Prompt Reactive
</Button>

<Markdown {docs} />
