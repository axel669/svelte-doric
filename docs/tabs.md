# Tabs
This component doesn't render any tabs.
Instead it creates a context that tabs and tab lists can use to know what to
show.

Used in conjunction with [TabLabel](./tab-label.md) and
[TabPanel](./tab-panel.md).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `selectedTab` | _any_ | | The value for the currently selected tab

## Usage
```html
<script>
    let selectedTab
</script>

<Tabs bind:selectedTab>
    ...
</Tabs>
```
