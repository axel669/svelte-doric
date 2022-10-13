# TitleBar

Component for making title bars at the top of elements on the page.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `center` | _boolean_ | `false` | If `false` the `TitleBar` text will be left-aligned by default. If `true` the text will be centered.
| `compact` | _boolean_ | | If true, `TitleBar` will be shorter and remove the background color.
| `sticky` | _boolean_ | `false` | If `true` the `TitleBar` will use sticky positioning at the top.

## Supported Adornment Slots
- menu
- action
- extension

## Usage
```html
<Paper card>
    <TitleBar compact>
        Section Title
    </TitleBar>

    ...
</Paper>
```
