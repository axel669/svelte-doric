<script>
    import Ripple from "./ripple.svelte"

    let klass = ""
    export {klass as class}
</script>

<style>
    action-area {
        --ripple-color: var(--ripple-normal);
        display: grid;
        overflow: hidden;
        position: relative;
        cursor: pointer;
    }
</style>

<action-area on:tap class={klass}>
    <slot />
    <Ripple />
</action-area>
