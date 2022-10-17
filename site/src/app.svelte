<script>
    import {
        AppStyle,
        Baseline as baseline,

        drawer,

        Adornment,
        AppBar,
        Button,
        Icon,
        Paper,
        Screen,
    } from "@core"

    import Menu from "./app/menu.svelte"

    import { theme } from "./app/theme.mjs"
    import { view } from "./app/view.mjs"

    const openMenu = () => drawer.open(Menu)
</script>

<style>
    /* Style for the markdown renders */
    :global(table) {
        border: 1px solid var(--primary);
        border-collapse: collapse;
        border-radius: 4px;
    }
    :global(td, th) {
        border: 1px solid var(--primary);
        padding: 4px;
    }
</style>

<AppStyle {baseline} theme={$theme} />

<Screen>
    <AppBar slot="title">
        Svelte Doric Components

        <Adornment slot="menu">
            <Button compact on:tap={openMenu}>
                <Icon name="hamburger" />
            </Button>
        </Adornment>
    </AppBar>

    <Paper lscrollable square>
        <svelte:component this={$view} />
    </Paper>
</Screen>
