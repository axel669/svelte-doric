<script>
    import {
        Grid,
        Paper,
        Tabs,
        TabPanel,
        Text,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    let tab = "first"
    const tabOptions = [
        {label: "First", value: "first"},
        {label: "Second", value: "second"},
        {label: "Numeric", value: 0, icon: "flask"},
    ]
</script>

<h1>Tabs</h1>

<Paper card lautoRow="auto" lcols="1fr" layout={Grid}>
    <Tabs bind:tabGroup={tab} options={tabOptions} />

    <TabPanel value="first" tabGroup={tab}>
        First Tab Content
    </TabPanel>
    <TabPanel value="second" tabGroup={tab}>
        Second Tab Content
    </TabPanel>
    <TabPanel value={0} tabGroup={tab}>
        Number Tab Content
    </TabPanel>
</Paper>
<Paper card lcols="1fr 3fr" layout={Grid}>
    <Tabs bind:tabGroup={tab} options={tabOptions} vertical />

    <TabPanel value="first" tabGroup={tab}>
        First Tab Content
    </TabPanel>
    <TabPanel value="second" tabGroup={tab}>
        Second Tab Content
    </TabPanel>
    <TabPanel value={0} tabGroup={tab}>
        Number Tab Content
    </TabPanel>
</Paper>

<Markdown {docs} />
