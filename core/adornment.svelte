<script>
    export let flush
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

<doric-adornment class:flush>
    <slot />
</doric-adornment>
