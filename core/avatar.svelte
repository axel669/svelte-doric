<script>
    import vars from "./util/vars.js"

    export let size = "36px"
    export let imageSize = "contain"
    export let image
    export let textColor
    export let background

    $: avatarVars = {
        "avatar-size": size,
        "avatar-image": image ? `url(${image})` : null,
        "avatar-image-size": imageSize,
        "avatar-background": background,
        "avatar-text": textColor,
    }
</script>

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
        background-color: var(--avatar-background, var(--button-default-fill));
        color: var(--avatar-text, var(--button-default-text));
        font-size: var(--text-size-header);
    }
</style>

<avatar use:vars={avatarVars}>
    <slot />
</avatar>
