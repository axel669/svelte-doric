<script>
    import Ripple from "./ripple.svelte"

    export let label
    export let color
    export let clickable
</script>

<style>
    doric-chip {
        position: relative;
        overflow: hidden;
        vertical-align: text-bottom;
        display: inline-grid;
        grid-template-columns:
            min-content auto min-content
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
    doric-chip.clickable {
        cursor: pointer;
    }
    doric-chip.clickable::after {
        position: absolute;
        content: "";
        width: 100%;
        height: 100%;
        transition: background-color 250ms linear;
        background-color: rgba(0, 0, 0, 0);
    }
    doric-chip.clickable:not(.disabled):active::after {
        transition: background-color 100ms linear;
        background-color: var(--ripple-color, var(--ripple-normal));
    }
    doric-chip.primary {
        --fill-color: var(--primary);
    }
    doric-chip.secondary {
        --fill-color: var(--secondary);
    }
    doric-chip.danger {
        --fill-color: var(--danger);
    }

    div {
        display: flex;
        align-items: center;
        padding: 6px;
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<doric-chip class="{color}" on:click class:clickable>
    <slot name="start">
        <div />
    </slot>
    <div>
        {label}
    </div>
    <slot name="end">
        <div />
    </slot>
</doric-chip>
