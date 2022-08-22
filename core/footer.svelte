<script>
    export let bordered = false
</script>

<style>
    doric-footer {
        display: grid;
        grid-template-columns: max-content auto max-content;
        box-shadow: 0px -2px 4px rgba(0, 0, 0, 0.25);
        height: 56px;
        gap: 2px;
        padding: 2px;

        background-color: var(--card-background);
    }
    doric-footer.bordered {
        border: 1px solid var(--text-normal);
    }

    footer-area {
        display: grid;
    }
</style>

<doric-footer class:bordered>
    <footer-area>
        <slot name="left" />
    </footer-area>

    <footer-area>
        <slot />
    </footer-area>

    <footer-area>
        <slot name="right" />
    </footer-area>
</doric-footer>
