Component for creating tabs that can be used to switch between options or views.
The `Tabs` component only renders tabs and binds the currently selected tab,
while the `TabPanel` actually renders content based on the current tab value.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)
| `fillSelected` | _boolean_ | | If true, the selected tab will be filled with the primary color instead of just the border
| `tabGroup` | _any_ | | The value for the currently selected tab
| `options` | _Array_ | List of tabs to display. See below for tab option details
| `vertical` | _boolean_ | `false` | If true, display tabs vertically

## TabPabel Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `area` | _boolean_ | | If true, the panel will have the `grid-area: panel` css property set
| `tabGroup` | _any_ | | The selected tab value
| `value` | _any_ | | The value representing the tab option

### Tab Option Properties
```javascript
{
    label: String,
    value: Object,
    icon: Optional(String)
}
```

## Usage
```svelte
<script>
    let tab = "first"
    const tabOptions = [
        {label: "First", value: "first"},
        {label: "Second", value: "second"},
        {label: "Numeric", value: 0, icon: "flask"},
    ]
</script>

<Tabs bind:tabGroup={tab} options={tabOptions} vertical />

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
