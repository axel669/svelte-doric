<script>
    import Ripple from "./ripple.svelte"

    export let label
    export let color
    export let clickable
</script>

<style>
    chip {
        position: relative;
        overflow: hidden;
        vertical-align: text-bottom;
        display: inline-grid;
        grid-template-columns:
            minmax(12px, min-content) auto minmax(12px, min-content)
        ;

        border-radius: 16px;
        height: 30px;
        user-select: none;

        --fill-color: var(--button-default-fill);
        --text-normal: var(--text-invert);

        background-color: var(--fill-color);
        color: var(--text-invert);
        font-weight: 500;
        font-size: var(--text-size-info);
    }
    chip.clickable {
        cursor: pointer;
    }
    chip.primary {
        --fill-color: var(--primary);
    }
    chip.secondary {
        --fill-color: var(--secondary);
    }
    chip.danger {
        --fill-color: var(--danger);
    }

    div {
        display: flex;
        align-items: center;
    }
</style>

<chip class="{color}" on:tap class:clickable>
    <slot name="start">
        <div />
    </slot>
    <div>
        {label}
    </div>
    <slot name="end">
        <div />
    </slot>
    {#if clickable}
        <Ripple />
    {/if}
</chip>
