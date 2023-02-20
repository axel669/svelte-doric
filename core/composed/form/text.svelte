<script>
    import TextInput from "../../text-input.svelte"

    export let initial
    export let output
    export let props
</script>

<TextInput bind:tvalue={output} {initial} {...props} />
