<script>
    import { onMount } from "svelte"

    import Markdown from "svelte-markdown"

    export let docs

    onMount(
        () => {
            const codez = document.querySelectorAll("pre")
            for (const code of codez) {
                hljs.highlightBlock(code)
            }
        }
    )
</script>

<Markdown source={docs} />
