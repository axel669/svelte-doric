<script>
    export let flow
;</script>

<style>
app-bar {
    position: sticky;
    top: 0px;
    left: 0px;
    right: 0px;
    height: 56px;
    z-index: +50;
    background-color: var(--app-bar-background);
    color: var(--app-bar-text);

    display: grid;
    grid-template-columns: min-content auto min-content;
    grid-template-areas:
        "start-adornment title end-adornment"
    ;
    box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25);

    --button-fab-color: var(--app-bar-text);
    --ripple-color: var(--ripple-dark);
}
app-bar.flow {
    position: relative;
    z-index: +0;
}
app-bar :global(app-title) {
    grid-area: title;
    font-size: var(--text-size-title);
    display: flex;
    align-items: center;
    padding: 8px;
    font-weight: 700;
    user-select: none;
}
</style>

<app-bar class:flow>
    <slot />
</app-bar>
