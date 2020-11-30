<script>
    import {vars} from "./style/css.js"

    export let image
    export let alt
    export let height
    export let width
    export let fit = "contain"

    $: imageSize = {
        "image-width": width,
        "image-height": height,
    }
    $: imageFit = {
        "image-contain": fit,
    }
</script>

<style>
img {
    object-fit: var(--image-contain);
    width: 100%;
    height: 100%;
}
image-container {
    display: inline-block;
    width: var(--image-width);
    height: var(--image-height);
}
</style>

<image-container use:vars={imageSize}>
    <img src={image} {alt} use:vars={imageFit} />
</image-container>
