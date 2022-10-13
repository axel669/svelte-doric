# Tabs

This component doesn't render any tabs.
Instead it creates a context that tabs and tab lists can use to know what to
show.

Used in conjunction with [TabLabel](./tab-label.md) and
[TabPanel](./tab-panel.md).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `tabGroup` | _any_ | | The value for the currently selected tab
| `options` | _Array_ | List of tabs to display. See below for tab option details
| `vertical` | _boolean_ | `false` | If true, display tabs vertically

### Tab Option Properties
```javascript
{
    label: String,
    value: Object,
    icon: Optional(String)
}
```

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

<Tabs bind:tabGroup={tab} options={tabOptions} vertical />
```
