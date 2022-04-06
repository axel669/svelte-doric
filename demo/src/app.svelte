<script>
    import {
        AppStyle,
        Baseline as baseline,

        Adornment,
        Button,
        Checkbox,
        ControlDrawer,
        Drawer,
        Footer,
        Icon,
        Radio,
        OptionList,
        Paper,
        Select,
        Switch,
        Tabs,
        Text,
        TextInput,
        TitleBar,
    } from "@core"
    import { Flex } from "@layout"
    import { Dialog, Alert } from "@dialog"

    import ThemePicker from "./test/theme-picker.svelte"
    import SelectDialog from "./test/select-dialog.svelte"

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
</script>

<AppStyle {baseline} {theme} />

<Drawer bind:open>
    <ThemePicker bind:theme vertical />
    <Button on:tap={() => open = false}>
        Close
    </Button>
</Drawer>

<TitleBar sticky>
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
</TitleBar>

<Dialog let:options let:close bind:this={dialog} component={SelectDialog} />
<!-- <Dialog let:options let:close bind:this={dialog} component={Alert} /> -->
<Paper center footer square flat width="min(640px, 100%)">
    <Flex direction="column" gap="4px">
        <Select {options} bind:value label="Test Label" persistent let:selected let:info>
            <Text slot="selected">
                Current Item: {selected.label}
            </Text>
            <OptionList {info} variant="fill" color="secondary" slot="options" />
        </Select>
        <Select {options} bind:value label="Test Label" let:info icon="calendar">
            <OptionList {info} square={false} slot="options" />
        </Select>

        <Button color="primary" on:tap={openDialog}>
            Dialog Test
        </Button>
    </Flex>

    <Footer>
        <ThemePicker bind:theme slot="middle" />
    </Footer>
</Paper>
