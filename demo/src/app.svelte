<script>
    import AppStyle from "../../core/app-style"
    import baseline from "../../core/baseline"
    import LightTheme from "../../core/theme/light"
    import DarkTheme from "../../core/theme/dark"
    import TronTheme from "../../core/theme/tron"

    import Adornment from "../../core/adornment"
    import Button from "../../core/button"
    import Card from "../../core/card"
    import ActionLayout from "../../core/layout/action"
    import FlexLayout from "../../core/layout/flex"
    import GridLayout from "../../core/layout/grid"
    import Icon from "../../core/icon"
    import Image from "../../core/image"
    import Select from "../../core/select"
    import TitleBar from "../../core/title-bar"
    import Text from "../../core/text"

    import CircleSpinner from "../../core/circle-spinner"
    import HexagonSpinner from "../../core/hexagon-spinner"

    import Dialog from "../../core/dialog"
    import Alert from "../../core/dialog/alert"
    import Confirm from "../../core/dialog/confirm"
    import Prompt from "../../core/dialog/prompt"

    import hash from "../../core/browser/hash"

    // import Expandable from "./test/expandable.svelte"

    // import ButtonDemo from "./components/button.svelte"
    // import ChipDemo from "./components/chip.svelte"

    const onPage = (typeof document !== "undefined")
    const ssrStorage = {
        read: (name) => {
            if (onPage === false) {
                return null
            }

            const stored = localStorage.getItem(name)
            if (stored === null) {
                return null
            }
            return JSON.parse(stored)
        },
        write: (name, value) => {
            if (onPage === false) {
                return
            }

            localStorage.setItem(
                name,
                JSON.stringify(value)
            )
        }
    }

    // let themeName = JSON.parse(localStorage.theme ?? `"light"`)
    let themeName = ssrStorage.read("theme") ?? "light"
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
    // $: localStorage.theme = JSON.stringify(themeName)
    $: ssrStorage.write("theme", themeName)

    let wat = null
    let wat2 = null
    const openMenu = async () => console.log(
        await wat2.show({
            title: "Test",
            message: "Nope?",
            placeholder: "Some Example"
        })
    )

    // const componentList = [
    //     // ["adornment", "Adornment", AdornmentDemo],
    //     ["button", "Button", ButtonDemo],
    // ]

    // console.log(componentList)

    // const demos = {
    //     // "app-bar": TitleBarDemo,
    //     "button": ButtonDemo,
    //     "chip": ChipDemo,
    //     // "list": ListDemo,
    //     // "textArea": TextAreaDemo,
    //     // "textInput": TextInputDemo,
    //     // table: TableDemo,
    //     // checkbox: CheckboxDemo,
    // }
    // const demoList = Object.keys(demos).sort()
    // const nav = location =>
    //     () => document.location.hash = `/${location}`

    let open = false
    // const openMenu = () => open = true
    const closeMenu = () => open = false
    $: closeMenu($hash)
</script>

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

<Dialog component={Alert} bind:this={wat} persistent />
<Dialog component={Prompt} bind:this={wat2} persistent />

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

    <!-- <Tabs bind:selectedTab> -->
        <!-- <Drawer bind:open on:close={closeMenu}>
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
        </Drawer> -->

        <demo-area>
            <FlexLayout gap="4px" itemFill>
                <Card>
                    <FlexLayout direction="column">
                        Some content
                        <div>hi</div>
                        <span>Line 3?</span>
                        <span>Line 4?</span>
                    </FlexLayout>
                </Card>
                <Card color="primary">
                    <svelte:fragment slot="title">
                        Title Text
                    </svelte:fragment>
                    <FlexLayout direction="column">
                        Some content
                        <div>hi</div>
                        <span>Line 3?</span>
                        <span>Line 4?</span>
                    </FlexLayout>
                </Card>

                <flex-break />

                <Card color="secondary">
                    <svelte:fragment slot="title">
                        Title Text
                    </svelte:fragment>
                    <ActionLayout>
                        <FlexLayout direction="column">
                            Some content
                            <div>hi</div>
                            <span>Line 3?</span>
                            <span>Line 4?</span>
                        </FlexLayout>

                        <FlexLayout direction="column" itemFill>
                            <Button color="primary">Maybe</Button>
                            <Button color="danger">Nope</Button>
                            <flex-break />
                            <Button color="secondary">Sure</Button>
                        </FlexLayout>
                    </ActionLayout>
                </Card>
                <Card color="danger">
                    <svelte:fragment slot="title">
                        Title Text
                    </svelte:fragment>
                    <ActionLayout>
                        <FlexLayout direction="column">
                            Some content
                            <div>hi</div>
                            <span>Line 3?</span>
                            <span>Line 4?</span>
                        </FlexLayout>

                        <GridLayout rows={2} direction="column">
                            <Button color="primary">Maybe</Button>
                            <Button color="danger">Nope</Button>
                            <Button color="secondary">Sure</Button>
                        </GridLayout>
                    </ActionLayout>
                </Card>
            </FlexLayout>

            Doric Components?
            <CircleSpinner />
            <HexagonSpinner />
            <!-- {#each componentList as [id, title, component] (id)}
                <Expandable {id} {title} {component} />
            {/each} -->
            <!-- <TabPanel value="">
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
            </TabPanel> -->
            <!-- {#each Object.entries(demos) as [demo, component]}
                <TabPanel value="/{demo}">
                    <svelte:component this={component} />
                </TabPanel>
            {/each} -->
        </demo-area>
    <!-- </Tabs> -->
</page-layout>
