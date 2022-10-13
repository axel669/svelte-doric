# Divider

Simple horizontal or vertical divider to separate content areas.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component
| `vertical` | _boolean_ | `false` | If true, `Divider` will show vertically instead of horizontally

## Usage
```html
<vertical-content>
    Content
    <Divider class />
    More Content
</vertical-content>

<horizontal-content>
    Content
    <Divider class vertical />
    More Content
</horizontal-content>
```
