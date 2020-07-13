<script>
import css from "./style/css.js"

export let size = "36px"
export let imageSize = "contain"
export let image
export let textColor
export let background

;$: vars = css.vars({
    "avatar-size": size,
    "avatar-image": `url(${image})`,
    "avatar-image-size": imageSize,
    "avatar-background": background,
    "avatar-text": textColor,
})
;</script>

<style>
avatar {
    display: inline-flex;
    background-image: var(--avatar-image);
    background-position: center center;
    background-size: var(--avatar-image-size);
    width: var(--avatar-size);
    height: var(--avatar-size);
    border-radius: 50%;
    justify-content: center;
    align-items: center;
    background-color: var(--avatar-background, transparent);
    color: var(--avatar-text, var(--text-normal));
    font-size: var(--text-size-title);
}
</style>

<avatar style={vars}>
    <slot />
</avatar>
