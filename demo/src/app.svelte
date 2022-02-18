<script>
    import {
        AppStyle,
        Baseline as baseline,

        Adornment,
        Button,
        Card,
        Checkbox,
        Drawer,
        Footer,
        Icon,
        Radio,
        Paper,
        Select,
        Switch,
        Tabs,
        Text,
        TextInput,
        TitleBar,
    } from "@core"
    import { Flex } from "@layout"

    import ThemePicker from "./test/theme-picker.svelte"
    import NewText from "./test/new-text.svelte"

    let theme = null

    let value = "all your money"

    let open = false
</script>

<AppStyle {baseline} {theme} />

<TitleBar sticky>
    Doric Components Testing

    <Adornment slot="menu">
        <Button on:tap={() => open = true}>
            <Icon name="list" size="16px" />
        </Button>
    </Adornment>

    <Adornment slot="action">
        <Button>
            <Icon name="box-arrow-right" size="16px" />
        </Button>
    </Adornment>
</TitleBar>

<Drawer {open} on:close={() => open = false}>
    <ThemePicker bind:theme vertical />
</Drawer>

<Paper center footer square flat width="min(640px, 100%)">
    <Flex direction="column" gap="4px">
        <TextInput label="Taxes" bind:value error>
            <Adornment slot="start">
                <Text adorn>$</Text>
            </Adornment>
        </TextInput>
        <TextInput label="Taxes" bind:value error />
        <TextInput bind:value extra="additional info?">
            <Adornment slot="start">
                <Text adorn>$</Text>
            </Adornment>
        </TextInput>
        <TextInput flat bind:value>
            <Adornment slot="start">
                <Text adorn>$</Text>
            </Adornment>
        </TextInput>
        <TextInput label="Taxes" flat bind:value extra="not enough" error />

        <Paper card>
            <TitleBar>
                Test Card?
            </TitleBar>

            <Text>
                Content!
            </Text>
        </Paper>
        <Paper card>
            <TitleBar compact>
                Test Card?
            </TitleBar>

            <Text>
                Content!
            </Text>
        </Paper>

        <Button>
            Button?
        </Button>
    </Flex>

    <Footer>
        <ThemePicker bind:theme slot="middle" />
    </Footer>
</Paper>
