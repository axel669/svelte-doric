<script>
    import vars from "./util/vars.js"

    export let source
    export let alt
    export let height
    export let width
    export let fit = "contain"
    export let float

    $: props = {
        float,
        "image-width": width,
        "image-height": height,
        "image-contain": fit,
    }
</script>

<style>
img {
    width: 100%;
    height: 100%;

    float: var(--float, none);
    object-fit: var(--image-contain);
    width: var(--image-width);
    height: var(--image-height);
}
</style>

<img src={source} {alt} use:vars={props} />
