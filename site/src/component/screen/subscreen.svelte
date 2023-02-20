<script>
    import {
        Appbar,
        Button,
        Icon,
        Paper,
        Screen,
        Tabs,
        TabPanel,
        Text,
    } from "@core"

    import Sub2 from "./subscreen2.svelte"

    let screen = null
    let tabGroup = "left"
    const options = [
        { label: "Left Twix", value: "left" },
        { label: "Right Twix", value: "right" },
    ]
</script>

<Screen bind:this={screen}>
    <Appbar slot="title">
        Subscreen \o/

        <Button on:click={() => screen.close()} adorn slot="action">
            <Icon name="close" />
        </Button>

        <Tabs bind:tabGroup {options} adorn="no-reskin" slot="extension" />
    </Appbar>

    <Paper card square>
        <Button on:click={() => screen.openStack(Sub2)}>
            Open Another Subscreen
        </Button>
        <TabPanel {tabGroup} value="left">
            Acceptable
        </TabPanel>
        <TabPanel {tabGroup} value="right">
            The better side of Twix
        </TabPanel>
    </Paper>
</Screen>
