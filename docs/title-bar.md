# TitleBar
> svelte-doric/core/title-bar

Component for making title bars either at the top of apps or within elements on
the page.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `center` | _boolean_ | `false` | If `false` the `TitleBar` text will be left-aligned by default. If `true` the text will be centered
| `compact` | _boolean_ | | If true, `TitleBar` will be shorter and remove the background color
| `sticky` | _boolean_ | `false` | If `true` the `TitleBar` will use sticky positioning at the top. Leave false for titles within elements like `Paper` cards

## Supported Adornment Slots
- menu
- action
- extension

## Usage
```html
<TitleBar sticky center>
    App Title

    <Adornment slot="end">
        Some Controls
    </Adornment>
</TitleBar>

<Paper card>
    <TitleBar compact>
        Section Title
    </TitleBar>

    ...
</Paper>
```
