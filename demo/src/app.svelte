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

    import Calendar from "./calendar.svelte"

    // import TitleBarDemo from "./components/app-bar.svelte"
    import ButtonDemo from "./components/button.svelte"
    import ChipDemo from "./components/chip.svelte"
    // import ListDemo from "./components/list.svelte"
    // import TableDemo from "./components/table.svelte"
    // import TextAreaDemo from "./components/text-area.svelte"
    // import TextInputDemo from "./components/text-input.svelte"
    // import CheckboxDemo from "./components/checkbox.svelte"
    let visible = false
    let visibleModal = false

    // const options = Array.from(
    //     {length: 4},
    //     (_, i) => ({
    //         label: `Item ${i}`,
    //         value: i
    //     })
    // )

    $: selectedTab = $hash

    let checked = JSON.parse(localStorage.themeToggle ?? "false")
    let themeName = JSON.parse(localStorage.theme ?? `"light"`)
    const themeOptions = [
        {label: "Light", value: "light"},
        {label: "Dark", value: "dark"},
        {label: "Tron", value: "tron"},
    ]
    const themeMap = {
        light: LightTheme,
        dark: DarkTheme,
        tron: TronTheme,
    }
    $: theme = themeMap[themeName]
    $: localStorage.theme = JSON.stringify(themeName)
    // $: theme = (checked === true) ? DarkTheme : LightTheme
    // $: theme = (checked === true) ? DarkTheme : TronTheme
    // $: localStorage.themeToggle = JSON.stringify(checked)

    const options = Array.from(
        {length: 4},
        (_, i) => ({
            label: `Shoe #${i}`,
            value: i
        })
    )

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

    let dateOpen = false
    let date = new Date()
    $: console.log(date)
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
            <Select bind:value={themeName} options={themeOptions} variant="flat" let:selectedItem>
                <div slot="selected" style="white-space: nowrap;">
                    Theme: {selectedItem.label}
                </div>
            </Select>
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
            <List items={demoList} let:item>
                <list-item dividers control>
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
                Doric is a library of svelte components.
                <TextInput label="testing" />
                <TextInput label="testing" variant="outline" />
                <Card>
                    <TextInput label="wat">
                        <Adornment position="end">
                            <Select {options} />
                        </Adornment>
                    </TextInput>
                </Card>
                <Select {options} />
                <div>
                    {#each Array.from({length: 100}) as _, i}
                        <div>{i}</div>
                    {/each}
                </div>
            </TabPanel>
            {#each Object.entries(demos) as [demo, component]}
                <TabPanel value="/{demo}">
                    <svelte:component this={component} />
                </TabPanel>
            {/each}
        </demo-area>
    </Tabs>
</page-layout>
