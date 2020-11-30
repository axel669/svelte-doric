<script>
    export let position = ""
    export let stretch
</script>

<style>
    adornment {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        padding: 4px;
    }
    adornment.start {
        grid-area: start-adornment;
    }
    adornment.end {
        grid-area: end-adornment;
    }
    adornment.stretch {
        align-items: stretch;
    }
</style>

<adornment class={position} class:stretch>
    <slot />
</adornment>
