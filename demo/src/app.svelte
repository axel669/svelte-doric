<script>
    import {
        AppStyle,
        Baseline as baseline,

        Adornment,
        Avatar,
        AppBar,
        Badge,
        Button,
        Checkbox,
        Chip,
        ControlDrawer,
        Footer,
        Icon,
        Radio,
        OptionList,
        Paper,
        Screen,
        Select,
        Switch,
        Tabs,
        Text,
        TextInput,
        TitleBar,

        Flex,
        Grid,

        Alert,
        Confirm,
        Prompt,

        dialog,
        drawer,
        portal,
    } from "@core"

    import ThemePicker, { theme } from "./test/theme-picker.svelte"
    import SelectDialog from "./test/select-dialog.svelte"
    import AppMenu from "./app-menu.svelte"

    import Subscreen from "./test/subscreen.svelte"

    let open = false

    let value = 1
    const options = Array.from(
        { length: 50 },
        (_, i) => ({
            label: `Option #${i}`,
            value: i,
        })
    )
    // const options = [
    //     { label: "Some Longer Employee Name", value: 0},
    //     { label: "test 2", value: 1},
    //     { label: "test 3", value: 2},
    // ]

    const openDialog = async () => {
        console.log(
            await dialog.show(
                SelectDialog,
                {
                    title: "Testing",
                    message: "Select?",
                    persistent: true,
                }
            )
        )
    }

    let mainScreen = null
    const turnOn = () => mainScreen.openStack(
        Subscreen,
        { value: new Date().toLocaleString() }
    )

    const openThing = (value) => {
        if (mainScreen === null) {
            return
        }

        mainScreen.openStack(
            Subscreen,
            { value }
        ).then(console.log)
    }
    $: openThing(value)

    const openMenu = async () => {
        console.log(
            await drawer.open(AppMenu, { theme })
        )
    }
</script>

<style>
    area-view {
        display: block;
        background-color: teal;
        border: 1px solid white;
        min-height: 54px;
    }
</style>

<AppStyle {baseline} theme={$theme} />

<Screen bind:this={mainScreen}>
    <AppBar fixed slot="title">
        Doric Components Testing

        <Adornment slot="menu" flush>
            <Button on:tap={openMenu} compact>
                <Icon name="burger" size="20px" />
            </Button>
        </Adornment>

        <Adornment slot="action">
            <Button>
                <Icon name="arrow-right-from-bracket" size="16px" />
            </Button>
        </Adornment>

        <Adornment slot="extension" flush>
            <ThemePicker />
        </Adornment>
    </AppBar>

    <Paper square card>
        <Flex>
            <Grid cols="repeat(4, 1fr)">
                <Button>Normal</Button>
                <Button color="primary">Normal</Button>
                <Button color="secondary">Normal</Button>
                <Button color="danger">Normal</Button>

                <Button variant="outline">Normal</Button>
                <Button variant="outline" color="primary">Normal</Button>
                <Button variant="outline" color="secondary">Normal</Button>
                <Button variant="outline" color="danger">Normal</Button>

                <Button variant="fill">Normal</Button>
                <Button variant="fill" color="primary">Normal</Button>
                <Button variant="fill" color="secondary">Normal</Button>
                <Button variant="fill" color="danger">Normal</Button>
            </Grid>

            <Paper>
                <Flex>
                    <Text>
                        Testing
                    </Text>
                </Flex>
            </Paper>
            <Paper>
                <Flex>
                    <Text>
                        Testing
                    </Text>
                </Flex>
            </Paper>
            <Paper card>
                <Flex>
                    <Text>
                        Testing
                    </Text>
                </Flex>
            </Paper>
            <Paper card>
                <Flex>
                    <Text>
                        Testing
                    </Text>
                </Flex>
            </Paper>
        </Flex>
        <!-- <Flex scrollable>
            <div style="display: grid; height: 100px;">
                <Flex center>
                    <Text>wat</Text>
                    <Text>woah</Text>
                    <Text textColor="teal">nope</Text>
                </Flex>
            </div>
            <Button on:tap={turnOn} variant="outline" buttonColor="gold">
                Open
            </Button>
            <Button on:tap={openDialog}>
                dialog
            </Button>
            <Select {options} bind:value label="Test Label" persistent let:selected let:info searchable>
                <Text slot="selected">
                    Current Item: {selected.label}
                </Text>
                <OptionList {info} variant="fill" color="secondary" slot="options" />
            </Select>
            <Grid cols="repeat(3, 1fr)" autoRow="60px" scrollable>
                {#each Array.from({ length: 60 }) as _, index}
                    <area-view style="position: sticky; top: 0px;">
                        {index}
                    </area-view>
                {/each}
            </Grid>
        </Flex> -->
    </Paper>

    <Footer slot="footer" bordered>
        <ThemePicker />
    </Footer>
</Screen>

<!-- <Dialog let:options let:close bind:this={dialog} component={SelectDialog} /> -->
<!-- <AppBar fixed slot="title">
    Doric Components Testing

    <Adornment slot="menu" flush>
        <Button on:tap={() => open = true} compact>
            <Icon name="bars" size="16px" />
        </Button>
    </Adornment>

    <Adornment slot="action">
        <Button>
            <Icon name="arrow-right-from-bracket" size="16px" />
        </Button>
    </Adornment>
</AppBar>
<Paper center square flat width="min(640px, 100%)">
    <Flex direction="column" gap="4px">
        <Select {options} bind:value label="Test Label" persistent let:selected let:info>
            <Text slot="selected">
                Current Item: {selected.label}
            </Text>
            <OptionList {info} variant="fill" color="secondary" slot="options" />
        </Select>
        <Select {options} bind:value label="Test Label" let:info icon="calendar" searchable>
            <OptionList {info} square={false} slot="options" />
        </Select>

        <Button color="primary" on:tap={openDialog}>
            Dialog Test
        </Button>

        <TitleBar compact>
            Avatar
        </TitleBar>
        <div>
            <Avatar image="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/c78bc3fc-9f08-47ca-81ae-d89055c7ec49/db5kks6-1f7e97e5-d745-41ac-beda-0855c2488a7c.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2M3OGJjM2ZjLTlmMDgtNDdjYS04MWFlLWQ4OTA1NWM3ZWM0OVwvZGI1a2tzNi0xZjdlOTdlNS1kNzQ1LTQxYWMtYmVkYS0wODU1YzI0ODhhN2MucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.dKtsIK_8EwSDF_BHRiF4BkZHblpEx8-BujZX2tpWD38" />
            <Avatar>
                CM
            </Avatar>
        </div>

        <TitleBar compact>
            Button
        </TitleBar>
        <Grid cols={4}>
            <Button>Normal</Button>
            <Button color="primary">Normal</Button>
            <Button color="secondary">Normal</Button>
            <Button color="danger">Normal</Button>

            <Button variant="outline">Normal</Button>
            <Button variant="outline" color="primary">Normal</Button>
            <Button variant="outline" color="secondary">Normal</Button>
            <Button variant="outline" color="danger">Normal</Button>

            <Button variant="fill">Normal</Button>
            <Button variant="fill" color="primary">Normal</Button>
            <Button variant="fill" color="secondary">Normal</Button>
            <Button variant="fill" color="danger">Normal</Button>
        </Grid>

        <TitleBar compact>
            Badge
        </TitleBar>
        <div>
            <Badge>
                Some Content
                <div slot="content">
                    10
                </div>
            </Badge>
        </div>

        <TitleBar compact>
            Checkbox
        </TitleBar>
        <div>
            <div>+Color Variations</div>
            <Checkbox>Label</Checkbox>
            <Checkbox color="primary">Label</Checkbox>
            <Checkbox color="secondary">Label</Checkbox>
            <Checkbox color="danger">Label</Checkbox>
        </div>

        <TitleBar compact>
            Checkbox
        </TitleBar>
        <div>
            <div>+Color Variations</div>
            <Chip label="Content" />
        </div>

        <TitleBar compact>
            Switch
        </TitleBar>
        <div>
            <div>+Color Variations</div>
            <Switch>
                Label
            </Switch>
        </div>

        <TitleBar compact>
            Text Input
        </TitleBar>
        <div>
            <div>+Color Variations</div>
            <TextInput label="outline" />
            <TextInput />
            <TextInput label="flat" flat />
        </div>
        {#each Array.from({ length: 30}) as _, index}
            <div>Stuff: {index}</div>
        {/each}
    </Flex>

    <Footer>
        <ThemePicker bind:theme slot="middle" />
    </Footer>
</Paper> -->
