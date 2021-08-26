# TitleBar
Component for making title bars either at the top of apps or within elements on
the page.

Use [`Adornment`](./adornment.md) with `"start"` and `"end"` positions to add
controls around the title text.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `center` | _boolean_ | `false` | If `false` the `TitleBar` text will be left-aligned by default. If `true` the text will be centered
| `sticky` | _boolean_ | `false` | If `true` the `TitleBar` will use sticky positioning at the top. Leave false for titles within elements like `Card`s

## Slots
| Name | Description |
| --- | --- |
| _default_ | Default slot contains the title to show
| `adornments` | Any adornments to put in the `Titlebar`

## Supported Adornment Positions
- menu
- action
- extension

## Usage
```html
<TitleBar sticky center>
    App Title

    <svelte:fragment slot="adornments">
        <Adornment position="end">
            Some Controls
        </Adornment>
    </svelte:fragment>
</TitleBar>

<Card>
    <TitleBar>
        Section Title
    </TitleBar>

    ...
</Card>
```
