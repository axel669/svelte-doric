<script>
    import { grid } from "@core"

    export let label = ""
    export let value = ""
    export let extra = ""
    export let flat
    export let error

    let input = null
    export const focus = () => input.focus()
</script>

<style>
    doric-text-input {
        position: relative;
        display: grid;
        cursor: text;
        grid-template-columns:
            minmax(0px, max-content)
            auto
            minmax(0px, max-content)
        ;
        grid-template-rows: max-content auto minmax(0, max-content);
        grid-template-areas:
            "label label label"
            "start input end"
            "extra extra extra"
        ;
    }
    doric-text-input::after {
        content: "";
        top: 0px;
        bottom: 0px;
        left: 0px;
        right: 0px;
        border: 1px solid var(--control-border);
        border-radius: 4px;
        pointer-events: none;
        grid-area: label / label / input / label;
    }
    doric-text-input:not(.error):focus-within {
        --control-border: var(--primary);
    }
    doric-text-input.error {
        --control-border: var(--danger);
    }
    doric-text-input.flat::after {
        border-width: 0px;
        border-bottom: 2px solid var(--control-border);
        border-radius: 0px;
    }

    input {
        background-color: transparent;
        color: var(--text-normal);
        font: var(--font);
        border-width: 0px;
        min-height: 28px;
        padding: 4px;
        min-width: 20px;
        grid-area: input;
    }
    input:focus {
        outline: none;
    }

    input-label {
        display: block;
        user-select: none;
        font-size: 13px;
        grid-area: label;
        padding: 2px 16px;
        border-bottom-right-radius: 4px;
        width: max-content;
        cursor: default;

        border-bottom: 1px solid var(--control-border);
        border-right: 1px solid var(--control-border);

        color: var(--control-border);
    }
    .flat input-label {
        border-width: 0px;
    }

    extra-text {
        display: block;
        grid-area: extra;
        padding: 2px 4px;
        color: var(--text-normal);
        font-size: var(--text-size-secondary);
    }
    .error > extra-text {
        color: var(--danger);
    }
    extra-text:empty, input-label:empty {
        display: none;
    }
</style>

<doric-text-input
tabindex="-1"
class:flat
class:error
on:focus={focus}
use:grid={$$props}
>
    <input-label>
        {label}
    </input-label>
    <input type="text"
        {...$$props}
        bind:value
        bind:this={input}
        on:focus
        on:blur
    />
    <extra-text>
        {extra}
    </extra-text>
    <slot />
</doric-text-input>
