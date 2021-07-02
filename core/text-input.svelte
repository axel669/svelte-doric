<script>
    import Control from "./control.svelte"

    export let label = ""
    export let error = ""
    export let info = ""
    export let variant
    let klass = ""
    export {klass as class}

    export let value = ""
    export let disabled = false
    export let type = "text"

    let inputElement = null
    export function focus() {
        inputElement.focus()
    }

    $: controlProps = {
        label,
        info,
        error,
        variant,
        disabled,
        klass,
    }
    $: inputProps = {
        type,
        disabled,
        ...$$restProps,
    }
;</script>

<style>
    input {
        font-family: var(--font);
        font-size: var(--text-size);
        grid-area: control;
        height: 40px;
        box-sizing: border-box;
        padding: 8px 4px;
        border-width: 0px;
        background-color: transparent;
        color: var(--text-normal);
        min-width: 24px;
    }
    input:focus {
        outline: none;
    }
</style>

<Control type="text-input" {...controlProps}>
    <input
        {...inputProps}
        bind:this={inputElement}
        bind:value
        on:focus
        on:blur
    />
    <slot />
</Control>
