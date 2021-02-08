# TabLabel
Component for listing tabs that can be switched to within the [Tabs](./tabs.md)
component.

Can be combined with [TabList](./tab-list.md) for a simple horizontal or
vertical arrangement of the tabs.

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
    <div>
        <TabLabel value="first">First Tab</TabLabel>
        <TabLabel value="second">Second Tab</TabLabel>
        <TabLabel value={0}>Number Tab</TabLabel>
    </div>

    ...
</Tabs>
```
