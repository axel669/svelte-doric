<script>
;</script>

<style>
app-bar {
    position: sticky;
    height: 56px;
    background-color: var(--primary);
    color: var(--text-light);

    display: grid;
    grid-template-columns: min-content auto min-content;
    grid-template-areas:
        "start-adornment title end-adornment"
    ;

    --button-fab-color: var(--text-light);
}
app-bar :global(app-title) {
    grid-area: title;
    font-size: var(--text-size-header);
    display: flex;
    align-items: center;
    padding: 8px;
    font-weight: 700;
    user-select: none;
}

app-bar > :global(adornment) {
    display: inline-flex;
    justify-content: center;
    align-items: center;
}
app-bar > :global(adornment[position="start"]) {
    grid-area: start-adornment;
    padding: 8px;
}
app-bar > :global(adornment[position="end"]) {
    grid-area: end-adornment;
    padding: 8px;
}
</style>

<app-bar>
    <slot />
</app-bar>
