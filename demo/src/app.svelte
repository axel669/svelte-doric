<script>
    import {
        AppStyle,
        Baseline as baseline,

        Adornment,
        Button,
        Checkbox,
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
    import { LightTheme, DarkTheme, TronTheme } from "@theme"
    import { Flex } from "@layout"

    import ThemePicker from "./test/theme-picker.svelte"

    const options = [
        { label: "Light Theme", value: "light", icon: "sun" },
        { label: "Dark Theme", value: "dark", icon: "moon" },
        { label: "Tron Theme", value: "tron", icon: "laptop" },
    ]
    const themeMap = {
        light: LightTheme,
        dark: DarkTheme,
        tron: TronTheme,
    }
    let currentTheme = localStorage.theme ?? "light"

    $: theme = themeMap[currentTheme]
    $: localStorage.theme = currentTheme

    let checked = false
</script>

<AppStyle {baseline} {theme} />

<Paper center footer square width="min(640px, 100%)">
    <TitleBar sticky>
        Doric Components Testing

        <svelte:fragment slot="adornments">
            <Adornment position="action">
                <Button>
                    <Icon name="box-arrow-right" size="16px" />
                </Button>
            </Adornment>
        </svelte:fragment>
    </TitleBar>

    <Flex direction="column">
        <Text>
            <i class="bi-alarm" />
            <Icon name="alarm" />
        </Text>

        <Button on:tap={console.log}>
            <Icon name="wifi" />
            Test
        </Button>

        <!-- <div>
            <Radio {options} bind:value={theme} />
        </div> -->

        <Checkbox bind:checked>
            Active
        </Checkbox>

        <Switch bind:checked>
            More Active
        </Switch>

        <TextInput label="Cost">
            <Adornment position="start">
                <Text adorn>$</Text>
            </Adornment>
        </TextInput>
    </Flex>

    <Footer>
        <svelte:fragment slot="middle">
            <Tabs bind:tabGroup={currentTheme} {options} iconTop />
        </svelte:fragment>
    </Footer>
</Paper>
