<script>
    import {
        Adornment,
        AppBar,
        Button,
        Flex,
        Icon,
        Paper,
        Screen,
        Tabs,
        TabPanel,
        Text,
    } from "@core"

    let screen = null
    let tabGroup = "left"
    const options = [
        { label: "Left Twix", value: "left" },
        { label: "Right Twix", value: "right" },
    ]
</script>

<Screen bind:this={screen}>
    <AppBar slot="title">
        Subscreen 2: Electric Boogaloo

        <Adornment slot="action">
            <Button on:tap={() => screen.close()}>
                <Icon name="close" />
            </Button>
        </Adornment>

        <Adornment flush ignoreReskin slot="extension">
            <Flex padding="0px">
                <Text>regular text?</Text>
                <Tabs bind:tabGroup {options} />
            </Flex>
        </Adornment>
    </AppBar>

    <Paper card square>
        <Button on:tap={() => screen.closeAll()}>
            Close Entire Stack
        </Button>
        <TabPanel {tabGroup} value="left">
            Acceptable
        </TabPanel>
        <TabPanel {tabGroup} value="right">
            The better side of Twix
        </TabPanel>
    </Paper>
</Screen>
