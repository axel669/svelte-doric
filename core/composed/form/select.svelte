<script>
    import Select from "../../select.svelte"

    export let initial
    export let output = initial
    export let props
</script>

<Select {...props} bind:value={output} />
