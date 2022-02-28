<script>
    import vars from "../util/vars"

    export let top = "0%"
    export let left = "0%"
    export let originX = "0%"
    export let originY = "0%"
    export let width = ""
    export let height = ""

    $: position = {
        top,
        left,
        originX,
        originY,
        width,
        height,
    }
</script>

<style>
    dialog-content {
        display: grid;
        position: absolute;

        top: var(--top);
        left: var(--left);
        transform: translate(
            calc(var(--originX) * -1),
            calc(var(--originY) * -1)
        );
        width: var(--width);
        height: var(--height);
    }
</style>

<dialog-content use:vars={position}>
    <slot />
</dialog-content>
