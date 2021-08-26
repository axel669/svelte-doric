# TabPanel
Component for displaying content with [Tabs](./tabs.md).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `tabGroup` | _any_ | | The selected tab value
| `value` | _any_ | | The value representing the tab option

## Usage
```html
<script>
    let tab = "first"
    const tabOptions = [
        {label: "First", value: "first"},
        {label: "Second", value: "second"},
        {label: "Numeric", value: 0, icon: "science"},
    ]
</script>

<Tabs bind:tabGroup={tab} options={tabOptions} />

<TabPanel value="first" tabGroup={tab}>
    First Tab Content
</TabPanel>
<TabPanel value="Second" tabGroup={tab}>
    Second Tab Content
</TabPanel>
<TabPanel value={0} tabGroup={tab}>
    Number Tab Content
</TabPanel>
```
