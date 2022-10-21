<script>
    export let flush
    export let ignoreReskin = false
</script>

<style>
    doric-adornment {
        display: grid;
        padding: 4px;
    }
    doric-adornment.flush {
        padding: 0px;
    }
</style>

<doric-adornment class:flush class:ignore-appbar-reskin={ignoreReskin}>
    <slot />
</doric-adornment>
