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
        Drawer,
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
    } from "@core"
    import { Dialog, Alert, Confirm, Prompt } from "@dialog"
    import { Flex, Grid } from "@layout"
    // import { TronTheme as theme } from "@theme"

    import ThemePicker from "./test/theme-picker.svelte"
    import SelectDialog from "./test/select-dialog.svelte"

    import Subscreen from "./test/subscreen.svelte"

    let theme = null

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

    let dialog = null
    const openDialog = async () => {
        console.log(
            await dialog.show({
                title: "Testing",
                message: "Select?"
            })
        )
    }

    let mainScreen = null
    const turnOn = () => mainScreen.openStack(
        Subscreen,
        { now: new Date().toLocaleString() }
    )

    const openThing = (value) => {
        if (mainScreen === null) {
            return
        }

        mainScreen.openStack(
            Subscreen,
            { value }
        )
    }
    $: openThing(value)
</script>

<style>
    area-view {
        display: block;
        background-color: teal;
        border: 1px solid white;
        min-height: 54px;
    }
</style>

<AppStyle {baseline} {theme} />

<Screen bind:this={mainScreen} full>
    <AppBar fixed slot="title">
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

        <Adornment slot="extension" flush>
            <ThemePicker bind:theme />
        </Adornment>
    </AppBar>

    <Paper square>
        <Flex scrollable>
            <Button on:tap={turnOn}>
                Open
            </Button>
                <Select {options} bind:value label="Test Label" persistent let:selected let:info>
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
        </Flex>
    </Paper>

    <Footer slot="footer">
        <ThemePicker bind:theme />
    </Footer>
</Screen>

<Drawer bind:open>
    <ThemePicker bind:theme vertical />
    <Button on:tap={() => open = false}>
        Close
    </Button>
</Drawer>

<!-- <Dialog let:options let:close bind:this={dialog} component={SelectDialog} /> -->
<!-- <Dialog let:options let:close bind:this={dialog} component={Prompt} />
<AppBar fixed slot="title">
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
