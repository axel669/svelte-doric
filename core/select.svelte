<script>
    import Control from "./control.svelte"
    import Icon from "./icon.svelte"

    export let label = ""
    export let error = ""
    export let info = ""
    export let variant
    let klass = ""
    export {klass as class}

    export let value = ""
    export let disabled = false

    $: controlProps = {
        label,
        info,
        error,
        variant,
        klass,
    }
</script>

<style>
    select {
        font: var(--font);
        grid-area: control;
        height: 40px;
        box-sizing: border-box;
        padding: 12px;
        padding-right: 32px;
        border-width: 0px;
        background-color: transparent;
        color: var(--text-normal);
        cursor: pointer;
        min-width: 32px;
        -webkit-appearance: none;
    }
    select:focus {
        outline: none;
    }
    select :global(option), select :global(optgroup) {
        font: var(--font);
        background-color: var(--background-layer);
        color: var(--text-normal);
        padding: 8px;
    }
    arrow-icon {
        position: absolute;
        bottom: calc(50% - 6px);
        right: 0px;
        transform: translateY(45%);
        pointer-events: none;
    }
</style>

<Control {...controlProps}>
    <select on:input bind:value {disabled}>
        <slot />
    </select>
    <arrow-icon>
        <Icon name="arrow_drop_down" size="28px" />
    </arrow-icon>
</Control>
