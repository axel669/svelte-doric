<script>
    export let variant = ""
    export let block = false
    export let color
    let klass = ""
    export {klass as class}

    ;$: variantClass = variant ? `variant-${variant}` : ""
;</script>

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
        color: var(--text-secondary);
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
</style>

<span class:block class="{variant} {color} {klass}">
    <slot />
</span>
