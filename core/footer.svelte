<script>
</script>

<style>
    doric-footer {
        display: grid;
        grid-template-columns: max-content auto max-content;
        box-shadow: 0px -2px 4px rgba(0, 0, 0, 0.25);
        height: 56px;

        background-color: var(--card-background);
    }

    footer-area {
        display: grid;
    }
</style>

<doric-footer>
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
