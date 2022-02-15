<script>
    import vars from "./util/vars"

    export let position = ""

    $: positionVars = {
        position: `${position}-adornment`
    }
</script>

<style>
    doric-adornment {
        display: grid;
        grid-area: var(--position);
        padding: 4px;
    }
</style>

<doric-adornment use:vars={positionVars}>
    <slot />
</doric-adornment>
