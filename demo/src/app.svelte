<script>
    import {
        AppTheme,
        Baseline as baseline,
        DarkTheme,
        LightTheme,

        Adornment,
        AppBar,
        Button,
        Card,
        CardContent,
        Checkbox,
        Dialog,
        Drawer,
        Icon,
        Text,

        Tabs,
        TabLabel,
        TabList,
        TabPanel,

        List,
        ListItem,
        ListItemContent,
        ListHeader,
        Divider,

        hash,
    } from "#lib"

    import AppBarDemo from "./components/app-bar.svelte"
    import ButtonDemo from "./components/button.svelte"
    import ChipDemo from "./components/chip.svelte"
    import ListDemo from "./components/list.svelte"
    import TableDemo from "./components/table.svelte"
    import TextAreaDemo from "./components/text-area.svelte"
    import TextInputDemo from "./components/text-input.svelte"
    import CheckboxDemo from "./components/checkbox.svelte"

    import NewControl from "./test/new-control.svelte"

    // const images = {
    //     tifa: "https://media.discordapp.net/attachments/641431274916937738/726691343111553065/tifa_bikini_alt_by_nopeys_ddyq6fp-fullview.png?width=606&height=937",
    //     camilla: "https://media.discordapp.net/attachments/641431274916937738/726691793801838642/dcqeyjp-bba7f4f5-a6f0-4b2f-8f15-13967385a3f7.png?width=571&height=937",
    //     samus: "https://i.etsystatic.com/17439113/r/il/9346c1/2039257844/il_570xN.2039257844_jh20.jpg",
    //     dnd: "https://media.discordapp.net/attachments/511777706438950922/728027209377513582/3l5ovvzru9851.png",
    // }
    // const image = images.dnd

    ;$: selectedTab = $hash

    let checked = JSON.parse(localStorage.themeToggle ?? "false")
    ;$: theme = (checked === true) ? DarkTheme : LightTheme
    ;$: localStorage.themeToggle = JSON.stringify(checked)

    const demos = {
        "app-bar": AppBarDemo,
        "button": ButtonDemo,
        "chip": ChipDemo,
        "list": ListDemo,
        "textArea": TextAreaDemo,
        "textInput": TextInputDemo,
        table: TableDemo,
        checkbox: CheckboxDemo,
    }
    const demoList = Object.keys(demos).sort()

    let open = false
    const openMenu = () => open = true
    const closeMenu = () => open = false
    ;$: closeMenu($hash)
;</script>

<style>
    page-layout {
        display: grid;
        grid-template-rows: min-content auto;
    }
    demo-area {
        display: block;
        width: 100%;
        max-width: 1024px;
        margin: auto;
    }
</style>

<AppTheme {theme} {baseline} />

<page-layout>
    <AppBar>
        <app-title>
            Svelte Doric Components
        </app-title>

        <Adornment position="start">
            <!-- <Button on:click={() => menu.show()} fab round="40px"> -->
            <Button on:click={openMenu} fab round="40px">
                <Icon name="menu" size="22px" />
            </Button>
        </Adornment>

        <Adornment position="end">
            <Checkbox
                bind:checked
                uncheckedIcon="brightness_high"
                checkedIcon="brightness_low"
            />
        </Adornment>
    </AppBar>

    <Tabs bind:selectedTab>
        <Drawer bind:open on:close={closeMenu}>
            <div style="width: 15vw;" />
            <List>
                <ListHeader color="primary">
                    Components
                </ListHeader>
                {#each demoList as demo}
                    <ListItem href="#/{demo}" target="_self">
                        <ListItemContent>
                            {demo.replace(/\b\w/g, s => s.toUpperCase())}
                        </ListItemContent>
                    </ListItem>
                    <Divider />
                {/each}
            </List>
        </Drawer>

        <demo-area>
            <TabPanel value="">
                Testing?
            </TabPanel>
            {#each Object.entries(demos) as [demo, component]}
                <TabPanel value="/{demo}">
                    <svelte:component this={component} />
                </TabPanel>
            {/each}
        </demo-area>
    </Tabs>
</page-layout>
