<script>
    import vars from "./util/vars.js"
    import grid from "./util/grid.mjs"

    export let adorn
    export let align = "left"
    export let block = false
    export let color = ""
    export let subtitle = false
    export let textColor = null
    export let textSize = null

    $: textOpts = {
        "typography-color": textColor,
        "typography-size": textSize,
    }
</script>

<style>
    span {
        color: var(--typography-color);
        font-size: var(--typography-size);
    }

    .block {
        display: block;
    }

    .subtitle {
        font-size: var(--text-size-subtitle);
    }

    .primary {
        color: var(--primary);
    }
    .secondary {
        color: var(--secondary);
    }
    .danger {
        color: var(--danger);
    }

    .left {
        text-align: left;
    }
    .right {
        text-align: right;
    }
    .center {
        text-align: center;
    }

    .adorn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
    }
</style>

<span
class:block
class:adorn
class:subtitle
class="{color} {align}"
use:vars={textOpts}
use:grid={$$props}
>
    <slot />
</span>
