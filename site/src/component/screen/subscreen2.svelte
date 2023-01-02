<script>
    import {
        Appbar,
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
    <Appbar slot="title">
        Subscreen 2: Electric Boogaloo

        <Button on:click={() => screen.close()} adorn slot="action">
            <Icon name="close" />
        </Button>

        <Flex padding="0px" adorn="no-reskin" slot="extension">
            <Text>regular text?</Text>
            <Tabs bind:tabGroup {options} />
        </Flex>
    </Appbar>

    <Paper card square>
        <Button on:click={() => screen.closeAll()}>
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
