<script>
    import vars from "./util/vars"

    export let width = "100%"

    $: variables = {
        width,
    }
</script>

<style>
    doric-footer {
        display: grid;
        grid-template-columns: max-content auto max-content;
        box-shadow: 0px -2px 4px rgba(0, 0, 0, 0.25);
        height: 56px;
        position: fixed;
        z-index: +50;
        bottom: 0px;
        left: 50%;
        transform: translate(-50%);

        /* width: var(--width); */
        width: inherit;

        background-color: var(--card-background);
    }

    footer-area {
        display: grid;
    }

    doric-footer-flow {
        display: block;
        height: 56px;
    }
</style>

<doric-footer-flow />
<doric-footer use:vars={variables}>
    <footer-area>
        <slot name="left" />
    </footer-area>

    <footer-area>
        <slot name="middle" />
    </footer-area>

    <footer-area>
        <slot name="right" />
    </footer-area>
</doric-footer>
