<script>
    import grid from "./util/grid.mjs"

    export let adorn
    export let extra = ""
    export let flat
    export let label = ""
    export let initial = ""
    export let value = initial

    export let validate = null
    export let transform = (text) => text
    export let tvalue

    let input = null
    export const focus = () => input.focus()

    $: tvalue = transform(value)
    $: error = validate?.(tvalue)
</script>

<style>
    doric-text-input {
        position: relative;
        display: grid;
        cursor: text;
        grid-template-columns:
            minmax(min-content, max-content)
            1fr
            minmax(min-content, max-content)
        ;
        grid-template-rows: max-content auto max-content;
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
    doric-text-input.adorn {
        margin: 4px;
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
    start-slot {
        display: grid;
        grid-area: start;
    }
    end-slot {
        display: grid;
        grid-area: end;
    }
</style>

<doric-text-input
tabindex="-1"
class:adorn
class:error
class:flat
class:ignore-appbar-reskin={adorn === "no-reskin"}
on:focus={focus}
use:grid={$$props}
>
    <input-label>
        {label}
    </input-label>
    {#if $$slots.start}
        <start-slot>
            <slot name="start" />
        </start-slot>
    {/if}
    <input type="text"
        {...$$props}
        bind:value
        bind:this={input}
        on:focus
        on:blur
    />
    {#if $$slots.end}
        <end-slot>
            <slot name="end" />
        </end-slot>
    {/if}
    <extra-text>
        {error ?? extra}
    </extra-text>
</doric-text-input>
