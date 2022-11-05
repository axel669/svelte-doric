Component for toggled controls (checkbox and regular toggle).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `checkbox` | _string_ | `"default"` | If true, the on and off icons will be appropriate for a checkbox. Just a shortand for those settings really
| `color` | _boolean_ | | The theme color to use for the `Toggle` checkmark. See the colors section of `Theme` for details
| `disabled` | _string_ | | I'm tired of docs, everyone knows what this is
| `label` | _string_ | | Optional. If given, will be the text displayed next to the toggle icon, otherwise it will use the child elements
| `iconpos` | _string_ | `"left"` | Placement of the icon relative to the label text/elements
| `on` | _string_ | | The toggle state
| `onIcon` | _string_ | | Icon to show when the toggle is on.
| `offIcon` | _string_ | | Icon to show when the toggle is off.

## Usage
```svelte
<Toggle col="span 2" label="Checkbox" bind:on checkbox />
<Toggle color="primary" col="span 2" label="Toggle" bind:on />
<Toggle color="secondary" label="Checkbox" bind:on iconpos="right" checkbox />
<Toggle color="danger" label="Toggle" bind:on iconpos="right">
    <img src="some cool image" />
</Toggle>
```
