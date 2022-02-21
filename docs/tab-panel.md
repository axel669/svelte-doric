# TabPanel
> svelte-doric

Component for displaying content with [Tabs](./tabs.md).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `area` | _boolean_ | | If true, the panel will have the `grid-area: panel` css property set
| `tabGroup` | _any_ | | The selected tab value
| `value` | _any_ | | The value representing the tab option

## Usage
```html
<script>
    let tab = "first"
    const tabOptions = [
        {label: "First", value: "first"},
        {label: "Second", value: "second"},
        {label: "Numeric", value: 0, icon: "flask"},
    ]
</script>

<Tabs bind:tabGroup={tab} options={tabOptions} />

<TabPanel value="first" tabGroup={tab} area>
    First Tab Content
</TabPanel>
<TabPanel value="Second" tabGroup={tab} area>
    Second Tab Content
</TabPanel>
<TabPanel value={0} tabGroup={tab} area>
    Number Tab Content
</TabPanel>
```
