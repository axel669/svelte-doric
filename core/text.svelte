<script>
    import vars from "./util/vars.js"

    export let secondary = false
    export let block = false
    export let align = "left"
    export let adorn
    export let color = ""
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

    .secondary {
        font-size: var(--text-size-secondary);
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
    }
</style>

<span
class:block
class:adorn
class:secondary
class="{color} {align}"
use:vars={textOpts}
>
    <slot />
</span>
