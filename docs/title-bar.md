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

## Child Tags
| Name | Description |
| --- | --- |
| `title-text` | Element that holds the text for the `TitleBar`

## Usage
```html
<TitleBar sticky center>
    <title-text>
        App Title
    </title-text>

    <Adornment position="end">
        Some Controls
    </Adornment>
</TitleBar>

<Card>
    <TitleBar>
        <title-text>
            Section Title
        </title-text>
    </TitleBar>

    ...
</Card>
```
