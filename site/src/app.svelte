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
    :global(blockquote) {
        margin-left: 0px;
        padding-left: 28px;
        border-left: 2px solid var(--primary);
    }
    :global(pre) {
        overflow: auto;
        padding: 4px;
    }

    site-content {
        display: flex;
        flex-direction: column;
        padding: 8px;
        gap: 4px;
        max-width: 720px;
    }
    @media screen and (min-width: 640px) {
        site-content {
            padding-left: 5vw;
        }
    }
</style>

<AppStyle {baseline} theme={$theme} />

<Screen full>
    <AppBar slot="title">
        Svelte Doric Components

        <Adornment slot="menu">
            <Button compact on:tap={openMenu}>
                <Icon name="hamburger" />
            </Button>
        </Adornment>
    </AppBar>

    <Paper lscrollable square>
        <site-content>
            <svelte:component this={$view} />
        </site-content>
    </Paper>
</Screen>
