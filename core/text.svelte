<script>
    export let variant = ""
    export let block = false
    export let align = "left"
    export let adorn
    export let color
    let klass = ""
    export {klass as class}

    $: variantClass = variant ? `variant-${variant}` : ""
</script>

<style>
    .block {
        display: block;
    }

    .title {
        display: block;
        font-size: var(--text-size-title);
        font-weight: 400;
        margin: 8px 0px;
    }
    .header {
        display: block;
        font-size: var(--text-size-header);
        font-weight: 400;
        margin: 4px 0px;
    }
    .variant-secondary {
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

<span class:block class:adorn class="{variantClass} {color} {klass} {align}">
    <slot />
</span>
