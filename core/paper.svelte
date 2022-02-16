<script>
    import vars from "./util/vars"

    export let border
    export let card
    export let center
    export let footer
    export let square
    export let width

    $: variables = {
        width,
    }
</script>

<style>
    doric-paper {
        display: block;
        border-radius: 4px;
        border-style: solid;
        border-width: 0px;
        box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
        overflow: hidden;

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
    doric-paper.border {
        border-width: var(--layer-border-width);
    }
</style>

<doric-paper
use:vars={variables}
class:center class:footer class:square class:border class:card
>
    <slot />
</doric-paper>
