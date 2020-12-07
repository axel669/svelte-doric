<script>
    import {
        AppStyle,
        Baseline as baseline,
        DarkTheme,
        LightTheme,
        TronTheme,

        Adornment,
        TitleBar,
        Button,
        Card,
        Checkbox,
        Drawer,
        Icon,
        Text,

        Tabs,
        TabLabel,
        TabList,
        TabPanel,

        List,

        Popover,
        TextInput,
        Select,
        Ripple,

        hash,
    } from "#lib"

    // import TitleBarDemo from "./components/app-bar.svelte"
    import ButtonDemo from "./components/button.svelte"
    import ChipDemo from "./components/chip.svelte"
    // import ListDemo from "./components/list.svelte"
    // import TableDemo from "./components/table.svelte"
    // import TextAreaDemo from "./components/text-area.svelte"
    // import TextInputDemo from "./components/text-input.svelte"
    // import CheckboxDemo from "./components/checkbox.svelte"

    // import NewControl from "./test/new-control.svelte"

    // const images = {
    //     tifa: "https://media.discordapp.net/attachments/641431274916937738/726691343111553065/tifa_bikini_alt_by_nopeys_ddyq6fp-fullview.png?width=606&height=937",
    //     camilla: "https://media.discordapp.net/attachments/641431274916937738/726691793801838642/dcqeyjp-bba7f4f5-a6f0-4b2f-8f15-13967385a3f7.png?width=571&height=937",
    //     samus: "https://i.etsystatic.com/17439113/r/il/9346c1/2039257844/il_570xN.2039257844_jh20.jpg",
    //     dnd: "https://media.discordapp.net/attachments/511777706438950922/728027209377513582/3l5ovvzru9851.png",
    // }
    // const image = images.dnd
    let visible = false
    let visibleModal = false

    const options = Array.from(
        {length: 4},
        (_, i) => ({
            label: `Item ${i}`,
            value: i
        })
    )

    $: selectedTab = $hash

    let test = 0
    $: console.log(test)

    let checked = JSON.parse(localStorage.themeToggle ?? "false")
    // $: theme = (checked === true) ? DarkTheme : LightTheme
    $: theme = (checked === true) ? DarkTheme : TronTheme
    $: localStorage.themeToggle = JSON.stringify(checked)

    const demos = {
        // "app-bar": TitleBarDemo,
        "button": ButtonDemo,
        "chip": ChipDemo,
        // "list": ListDemo,
        // "textArea": TextAreaDemo,
        // "textInput": TextInputDemo,
        // table: TableDemo,
        // checkbox: CheckboxDemo,
    }
    const demoList = Object.keys(demos).sort()
    const nav = location =>
        () => document.location.hash = `/${location}`

    let open = false
    const openMenu = () => open = true
    const closeMenu = () => open = false
    $: closeMenu($hash)
</script>

<!-- <svelte:window on:pointer-start={console.log} /> -->

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

<AppStyle {theme} {baseline} />

<page-layout>
    <TitleBar sticky>
        <title-text>
            Svelte Doric Components
        </title-text>

        <Adornment position="start">
            <Button on:tap={openMenu} fab round="40px">
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
    </TitleBar>

    <Tabs bind:selectedTab>
        <Drawer bind:open on:close={closeMenu}>
            <div style="width: 15vw;" />
            <TitleBar>
                <title-text>
                    Components
                </title-text>
            </TitleBar>
            <List items={demoList}>
                <list-item let:item slot="item" dividers control>
                    <list-item-content>
                        <Button on:tap={nav(item)}>
                            {item.replace(/\b\w/g, s => s.toUpperCase())}
                        </Button>
                    </list-item-content>
                </list-item>
            </List>
        </Drawer>

        <demo-area>
            <TabPanel value="">
                <Select {options} label="Testing" bind:value={test} />
                <Select {options} label="Testing" bind:value={test} let:item origin={{x: "100%", tx: "-100%", y: "50%"}}>
                    <div style="width: 200px;">
                        {item.label} ({item.label})
                    </div>
                </Select>
                <List items={options} let:item>
                    <list-item>
                        {item.label}
                        <Ripple />
                    </list-item>
                </List>
                <!-- <TextInput bind:valueAsNumber={test} type="date" /> -->
                <!-- Testing?
                <Popover {visible} anchor={{left: "0px", top: "10px"}}>
                    <Button on:tap={() => visible = true}>
                        Regular
                    </Button>
                    <div slot="content">
                        <Button color="secondary" variant="fill" on:tap={() => visible = false}>
                            Please Work?
                        </Button>
                    </div>
                </Popover>
                <Popover visible={visibleModal} anchor={{right: "0px", top: "0px"}} modal on:cancel={() => visibleModal = false}>
                    <Button on:tap={() => visibleModal = true}>
                        Modal
                    </Button>
                    <div slot="content">
                        <Button color="primary" variant="fill" on:tap={() => visibleModal = false}>
                            Please Work?
                        </Button>
                    </div>
                </Popover>
                {#each Array.from({length: 100}, (_, i) => i) as i}
                    <div>{i}</div>
                {/each} -->
            </TabPanel>
            {#each Object.entries(demos) as [demo, component]}
                <TabPanel value="/{demo}">
                    <svelte:component this={component} />
                </TabPanel>
            {/each}
        </demo-area>
    </Tabs>
</page-layout>
