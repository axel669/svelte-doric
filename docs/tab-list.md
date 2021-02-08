# TabList
Component for making simple horizontal or vertical arrangements for
[TabLabel](./tab-label.md) components.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `verical` | _boolean_ | `false` | If true, the tabs will be displayed vertically instead of horizontally

## Usage
```html
<script>
    let selectedTab = "first"
    let otherTab = "first"
</script>

<Tabs bind:selectedTab>
    <TabList>
        <TabLabel value="first">First Tab</TabLabel>
        <TabLabel value="second">Second Tab</TabLabel>
    </TabList>

    ...
</Tabs>

<Tabs bind:selectedTab={otherTab}>
    <TabList vertical>
        <TabLabel value="first">First Tab</TabLabel>
        <TabLabel value="second">Second Tab</TabLabel>
    </TabList>

    ...
</Tabs>
```
