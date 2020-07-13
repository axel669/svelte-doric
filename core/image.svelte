<script>
import css from "./style/css.js"

export let image
export let alt
export let height
export let width
export let fit = "contain"

;$: imageSize = css.vars({
    "image-width": width,
    "image-height": height,
})
;</script>

<style>
img {
    object-fit: var(--image-contain);
    width: 100%;
    height: 100%;
}
div {
    display: inline-block;
    width: var(--image-width);
    height: var(--image-height);
}
</style>

<div style={imageSize}>
    <img src={image} style="--image-contain: {fit}" {alt} />
</div>
