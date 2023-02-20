<script>
    import Toggle from "../../toggle.svelte"

    export let initial
    export let output = initial
    export let props
</script>

<Toggle bind:on={output} {...props} />
