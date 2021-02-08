# TabPanel
Component for displaying content with [Tabs](./tabs.md).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | _any_ | | The value representing the tab option

## Usage
```html
<script>
    let selectedTab = "first"
</script>

<Tabs bind:selectedTab>
    ...

    <TabPanel value="first">
        First Tab Content>
    </TabPanel>
    <TabPanel value="Second">
        Second Tab Content>
    </TabPanel>
    <TabPanel value=={0}>
        Number Tab Content>
    </TabPanel>
</Tabs>
```
