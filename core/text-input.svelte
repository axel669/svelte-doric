<script>
    export let type = "text"
    export let value
    export let label = ""
    export let extra = ""
    export let flat
    export let error

    let input = null
    const passFocus = () => {
        input.focus()
    }

    $: cheat = { type }
</script>

<style>
    doric-text-input {
        position: relative;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: max-content max-content;
        cursor: text;
    }
    input-area {
        position: relative;
        display: grid;
        grid-template-columns: max-content auto max-content;
        grid-template-rows: max-content auto;
        grid-template-areas:
            "label label label"
            ". . ."
        ;
    }

    input-label {
        display: block;
        user-select: none;
        font-size: 13px;
        color: var(--control-border);
        grid-area: label;
    }
    label-border {
        display: inline-block;
        border-right: 1px solid var(--control-border);
        border-bottom: 1px solid var(--control-border);
        border-bottom-right-radius: 4px;
        padding: 2px 16px;
        cursor: default;
    }
    label-border:empty {
        display: none;
    }

    input-border {
        border: 1px solid var(--control-border);
        border-radius: 4px;
        pointer-events: none;
        position: absolute;
        top: 0px;
        left: 0px;
        bottom: 0px;
        right: 0px;
    }

    extra-text {
        display: block;
        padding: 2px 4px;
        color: var(--control-border);
        font-size: var(--text-size-secondary);
    }
    extra-text:empty {
        display: none;
    }

    input {
        background-color: transparent;
        color: var(--text-normal);
        font: var(--font);
        border-width: 0px;
        height: 32px;
        padding: 4px;
    }
    input:focus {
        outline: none;
    }

    doric-text-input:not(.error) input:focus ~ input-border,
    doric-text-input:not(.error) input:focus ~ input-label {
        --control-border: var(--primary);
    }

    doric-text-input.error {
        --control-border: var(--danger);
    }
    doric-text-input.flat input-border {
        border-radius: 0px;
        border-width: 0px;
        border-bottom-width: 2px;
    }
    doric-text-input.flat label-border {
        border-radius: 0px;
        border-width: 0px;
        padding: 2px 4px;
    }
</style>

<doric-text-input tabindex="-1" on:focus={passFocus} class:flat class:error>
    <input-area>
        <slot name="start">
            <div />
        </slot>
        <input {...$$props} {...cheat} bind:value bind:this={input} />
        <slot name="end">
            <div />
        </slot>
        <input-border />
        <input-label>
            <label-border>
                {label}
            </label-border>
        </input-label>
    </input-area>
    <extra-text>
        {extra}
    </extra-text>
</doric-text-input>
