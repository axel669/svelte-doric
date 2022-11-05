<script>
    import {
        AppStyle,
        Baseline as baseline,

        drawer,

        Adornment,
        AppBar,
        Button,
        Grid,
        Icon,
        Paper,
        Screen,
    } from "@core"

    import Menu from "./app/menu.svelte"

    import { theme } from "./app/theme.mjs"
    import { view } from "./app/view.mjs"
    import screen from "./app/screen.mjs"

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

<Screen full bind:this={$screen}>
    <AppBar slot="title">
        Svelte Doric

        <Adornment flush slot="menu">
            <Grid padding="0px" cols="1fr 1fr">
                <Button adorn on:click={openMenu}>
                    <Icon name="hamburger" />
                </Button>
                <Button
                adorn
                link="https://github.com/axel669/svelte-doric|_blank"
                >
                    <Icon name="brands:github" />
                </Button>
            </Grid>
        </Adornment>

        <Adornment flush slot="action">
        </Adornment>
    </AppBar>

    <Paper lscrollable square>
        <site-content>
            <svelte:component this={$view} />
        </site-content>
    </Paper>
</Screen>
