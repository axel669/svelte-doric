<script>
    import {vars} from "./style/css.js"

    export let color = "primary"
    export let anchor = {}
    export let translate = {}

    $: badgeVars = {
        "anchor-top": anchor.top,
        "anchor-left": anchor.left,
        "translate-x": translate.x,
        "translate-y": translate.y,
    }
</script>

<style>
    badge-wrapper {
        position: relative;
        display: inline-grid;
    }
    doric-badge {
        display: flex;
        position: absolute;
        top: var(--anchor-top, 0px);
        left: var(--anchor-left, 100%);
        transform: translate(var(--translate-x, -50%), var(--translate-y, -50%));
        width: 24px;
        height: 24px;
        z-index: +10;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }

    .primary {
        background-color: var(--button-primary);
        color: var(--button-primary-text);
    }
    .secondary {
        background-color: var(--button-secondary);
        color: var(--button-secondary-text);
    }
    .danger {
        background-color: var(--button-danger);
        color: var(--button-danger-text);
    }
</style>

<badge-wrapper>
    <slot />
    <doric-badge class="{color}" use:vars={badgeVars}>
        <slot name="content" />
    </doric-badge>
</badge-wrapper>
