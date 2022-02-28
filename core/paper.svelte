<script>
    import vars from "./util/vars"

    export let card
    export let center
    export let flat
    export let footer
    export let scrollable
    export let square
    export let width

    $: variables = {
        width,
    }
</script>

<style>
    doric-paper {
        display: grid;
        border-radius: 4px;
        border-style: solid;
        border-width: 0px;
        box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        grid-template-columns: 1fr;
        grid-template-rows: max-content auto max-content;

        width: var(--width);

        background-color: var(--card-background);
        border-color: var(--border-color, var(--layer-border-color));
    }

    doric-paper.card {
        border-width: var(--layer-border-width);
    }

    doric-paper.square {
        border-radius: 0px;
    }

    doric-paper.center {
        margin: auto;
    }
    doric-paper.footer {
        padding-bottom: 56px;
    }
    doric-paper.flat {
        box-shadow: none;
    }

    doric-paper.scrollable {
        max-height: 100%;
        overflow: auto;
    }
</style>

<doric-paper
use:vars={variables}
class:card
class:center
class:flat
class:footer
class:square
class:scrollable
>
    <slot name="title">
        <div />
    </slot>
    <slot />
    <slot name="action">
        <div />
    </slot>
</doric-paper>
